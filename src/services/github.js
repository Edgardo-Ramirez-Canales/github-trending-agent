import { getGithubToken } from '../utils/storage.js'

// Todas las llamadas a la GitHub REST API v3 viven aquí.
// El token se lee de localStorage (viene del login OAuth o del override manual).
// Sin token la API funciona en modo limitado (60 req/h).

const API = 'https://api.github.com'

// --- utilidades base64 (UTF-8 seguro) ---
function decodeBase64Utf8(b64) {
  const limpio = (b64 || '').replace(/\n/g, '')
  const binario = atob(limpio)
  const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0))
  return new TextDecoder('utf-8').decode(bytes)
}

function encodeBase64Utf8(str) {
  const bytes = new TextEncoder().encode(str)
  let binario = ''
  bytes.forEach((b) => (binario += String.fromCharCode(b)))
  return btoa(binario)
}

// --- fetch base con auth + manejo de errores ---
async function ghFetch(path, options = {}) {
  const token = getGithubToken()
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...options.headers,
  }
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json'
    options = { ...options, body: JSON.stringify(options.body) }
  }

  const res = await fetch(`${API}${path}`, { ...options, headers })

  if (res.status === 204) return null // sin contenido (ej: algunas respuestas)

  let data = null
  const texto = await res.text()
  if (texto) {
    try {
      data = JSON.parse(texto)
    } catch {
      data = texto
    }
  }

  if (!res.ok) {
    const restante = res.headers.get('x-ratelimit-remaining')
    if (res.status === 403 && restante === '0') {
      throw new GithubError(
        'Límite de la API de GitHub alcanzado. Configura tu token para 5000 req/h.',
        res.status,
        data,
      )
    }
    const msg = (data && data.message) || `Error GitHub (${res.status})`
    throw new GithubError(msg, res.status, data)
  }

  return data
}

export class GithubError extends Error {
  constructor(message, status, payload) {
    super(message)
    this.name = 'GithubError'
    this.status = status
    this.payload = payload
  }
}

// ============================================================================
// LECTURA
// ============================================================================

// Normaliza un repo del search a la forma que consume la UI.
function normalizarRepo(r) {
  const creado = new Date(r.created_at)
  const diasVida = Math.max(
    1,
    Math.round((Date.now() - creado.getTime()) / 86_400_000),
  )
  return {
    id: r.id,
    nombre: r.full_name, // "owner/repo"
    owner: r.owner?.login,
    repo: r.name,
    descripcion: r.description || '',
    lenguaje: r.language || 'N/D',
    estrellas: r.stargazers_count,
    forks: r.forks_count,
    issuesAbiertos: r.open_issues_count,
    topics: r.topics || [],
    url: r.html_url,
    avatar: r.owner?.avatar_url,
    esFork: Boolean(r.fork),
    privado: Boolean(r.private),
    creadoEn: r.created_at,
    actualizadoEn: r.pushed_at || r.updated_at, // último push de código (actividad real)
    diasVida,
    // Velocidad de crecimiento aproximada: estrellas por día desde su creación.
    velocidad: Math.round((r.stargazers_count / diasVida) * 10) / 10,
  }
}

// ----------------------------------------------------------------------------
// Motor de consultas flexible (Fase 1)
// Permite los 3 modos (trending / usuario / repo) construyendo la query del
// search a partir de un objeto de filtros. El resto de la tubería
// (normalizarRepo, UI) se reutiliza igual entre modos.
// ----------------------------------------------------------------------------

// Fecha ISO (YYYY-MM-DD) a partir de un objeto Date.
function fechaISO(d) {
  return d.toISOString().slice(0, 10)
}

// Resuelve un preset de fecha o un rango a medida al fragmento `created:` del
// search de GitHub. Devuelve '' si no hay filtro de fecha.
//   preset: 'semana' | 'mesActual' | '3meses' | '6meses' | '9meses'
//         | 'anioActual' | 'ultimoAnio' | 'personalizado'
//   desde/hasta: 'YYYY-MM-DD' (solo cuando preset === 'personalizado')
export function construirRangoFecha({ preset, desde, hasta } = {}) {
  const hoy = new Date()

  if (preset === 'personalizado') {
    if (desde && hasta) return `created:${desde}..${hasta}`
    if (desde) return `created:>=${desde}`
    if (hasta) return `created:<=${hasta}`
    return ''
  }

  const haceDias = (n) => {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return fechaISO(d)
  }

  switch (preset) {
    case 'semana':
      return `created:>=${haceDias(7)}`
    case 'mesActual':
      return `created:>=${fechaISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1))}`
    case '3meses':
      return `created:>=${haceDias(90)}`
    case '6meses':
      return `created:>=${haceDias(180)}`
    case '9meses':
      return `created:>=${haceDias(270)}`
    case 'anioActual':
      return `created:>=${fechaISO(new Date(hoy.getFullYear(), 0, 1))}`
    case 'ultimoAnio':
      return `created:>=${haceDias(365)}`
    default:
      return ''
  }
}

// Construye el string `q` del search a partir de los filtros de servidor.
// Filtros de cliente (keyword visual, orden, lenguaje multi) NO van aquí.
export function construirQuery({
  modo = 'trending',
  fecha, // { preset, desde, hasta }
  dias, // piso de "últimos N días" usado SOLO si no hay fecha explícita
  minEstrellas,
  maxEstrellas,
  pushedDesde, // 'YYYY-MM-DD' → solo repos con push reciente (repos "vivos")
  usuario, // login o nombre de organización (modo usuario)
  lenguaje, // un lenguaje único a nivel query (opcional)
  busqueda, // término de texto libre → GitHub busca en nombre/descripción/README
} = {}) {
  const partes = []

  // Texto libre primero: GitHub lo matchea contra nombre, descripción y README.
  const termino = (busqueda || '').trim()
  if (termino) partes.push(termino)

  if (modo === 'usuario' && usuario) {
    partes.push(`user:${usuario.trim()}`)
  }

  let rangoFecha = construirRangoFecha(fecha)
  // Fallback: si no se eligió fecha pero sí un piso de días (trending), úsalo.
  if (!rangoFecha && dias != null) {
    const d = new Date()
    d.setDate(d.getDate() - dias)
    rangoFecha = `created:>=${fechaISO(d)}`
  }
  if (rangoFecha) partes.push(rangoFecha)

  // Rango de estrellas: min, max o ambos.
  if (minEstrellas != null && maxEstrellas != null) {
    partes.push(`stars:${minEstrellas}..${maxEstrellas}`)
  } else if (minEstrellas != null) {
    partes.push(`stars:>=${minEstrellas}`)
  } else if (maxEstrellas != null) {
    partes.push(`stars:<=${maxEstrellas}`)
  }

  if (pushedDesde) partes.push(`pushed:>=${pushedDesde}`)
  if (lenguaje) partes.push(`language:${lenguaje}`)

  return partes.join(' ').trim()
}

// Busca repos según filtros de servidor (modos trending / usuario).
// Salida normalizada → tubería reutilizable entre modos.
export async function buscarRepos(filtros = {}) {
  const q = construirQuery(filtros)
  // Si no hay ningún qualifier, evitamos un search vacío (GitHub lo rechaza).
  if (!q) return []
  const sort = filtros.sort || 'stars'
  const order = filtros.order || 'desc'
  const path =
    `/search/repositories?q=${encodeURIComponent(q)}` +
    `&sort=${sort}&order=${order}&per_page=60`
  const data = await ghFetch(path)
  const items = data?.items ?? []
  return items.map(normalizarRepo)
}

// Lista TODOS los repos de un usuario u organización paginando el endpoint REST
// (no el Search API): así no topamos con su límite de resultados ni con piso de
// estrellas, y traemos repos sin estrellas. El filtrado por palabra/lenguaje y el
// orden se hacen luego en cliente sobre esta lista.
//
// Si el usuario buscado es la propia cuenta autenticada (y hay token con scope
// `repo`), usamos `/user/repos?visibility=all`, que incluye los repos PRIVADOS.
// Para cualquier otro usuario u org usamos `/users/{login}/repos` (solo públicos).
export async function listarReposUsuario(usuario) {
  const login = (usuario || '').trim()
  if (!login) return []

  // ¿Es mi propia cuenta? Solo si hay token y el login coincide.
  let esCuentaPropia = false
  if (getGithubToken()) {
    try {
      const yo = await getUsuarioAutenticado()
      esCuentaPropia =
        yo?.login && yo.login.toLowerCase() === login.toLowerCase()
    } catch {
      esCuentaPropia = false // sin permiso para /user → tratamos como ajeno
    }
  }

  const PER_PAGE = 100
  const MAX_PAGINAS = 10 // tope de seguridad: hasta 1000 repos
  const acumulado = []
  for (let page = 1; page <= MAX_PAGINAS; page++) {
    const path = esCuentaPropia
      ? `/user/repos?visibility=all&affiliation=owner` +
        `&per_page=${PER_PAGE}&page=${page}&sort=updated&direction=desc`
      : `/users/${encodeURIComponent(login)}/repos` +
        `?per_page=${PER_PAGE}&page=${page}&sort=updated&direction=desc`
    const data = await ghFetch(path)
    const items = Array.isArray(data) ? data : []
    acumulado.push(...items)
    if (items.length < PER_PAGE) break // última página
  }
  return acumulado.map(normalizarRepo)
}

// Trae un repo puntual por owner/repo (modo repo / URL), NORMALIZADO para la
// lista (distinto de getRepo, que devuelve el detalle crudo de la API).
// Devuelve null si no existe (404).
export async function buscarRepoNormalizado(owner, repo) {
  try {
    const data = await ghFetch(`/repos/${owner}/${repo}`)
    return data ? normalizarRepo(data) : null
  } catch (e) {
    if (e.status === 404) return null
    throw e
  }
}

// Parsea una URL o "owner/repo" a { owner, repo }. Devuelve null si no calza.
// Acepta: https://github.com/owner/repo, github.com/owner/repo (con o sin
// /tree/..., .git, query o slash final) y el formato corto owner/repo.
export function parsearRepoUrl(entrada) {
  if (!entrada) return null
  let s = entrada.trim()
  s = s.replace(/^https?:\/\//i, '').replace(/^github\.com\//i, '')
  s = s.replace(/\.git$/i, '')
  const partes = s.split('/').filter(Boolean)
  if (partes.length < 2) return null
  const [owner, repo] = partes
  if (!owner || !repo) return null
  return { owner, repo }
}

// README decodificado (o '' si no existe).
export async function getReadme(owner, repo) {
  try {
    const data = await ghFetch(`/repos/${owner}/${repo}/readme`)
    return data?.content ? decodeBase64Utf8(data.content) : ''
  } catch (e) {
    if (e.status === 404) return ''
    throw e
  }
}

// Issues abiertos (primeros 20), excluyendo Pull Requests (la API los mezcla).
export async function getIssuesAbiertos(owner, repo, max = 20) {
  const data = await ghFetch(
    `/repos/${owner}/${repo}/issues?state=open&per_page=${max}`,
  )
  return (data ?? [])
    .filter((i) => !i.pull_request)
    .map((i) => ({
      numero: i.number,
      titulo: i.title,
      cuerpo: (i.body || '').slice(0, 500),
      etiquetas: (i.labels || []).map((l) => (typeof l === 'string' ? l : l.name)),
      reacciones: i.reactions?.total_count ?? 0,
    }))
}

// Estructura de archivos del nivel raíz.
export async function getArbolRaiz(owner, repo) {
  try {
    const data = await ghFetch(`/repos/${owner}/${repo}/contents`)
    return (data ?? []).map((f) => ({ nombre: f.name, tipo: f.type, path: f.path }))
  } catch (e) {
    if (e.status === 404) return []
    throw e
  }
}

// Detalle de un repo (default_branch, etc.).
export async function getRepo(owner, repo) {
  return ghFetch(`/repos/${owner}/${repo}`)
}

// SHA + contenido actual de un archivo (necesario para sobreescribir en commit).
export async function getContenidoArchivo(owner, repo, path, ref) {
  try {
    const q = ref ? `?ref=${encodeURIComponent(ref)}` : ''
    const data = await ghFetch(
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}${q}`,
    )
    return {
      sha: data.sha,
      contenido: data.content ? decodeBase64Utf8(data.content) : '',
      existe: true,
    }
  } catch (e) {
    if (e.status === 404) return { sha: null, contenido: '', existe: false }
    throw e
  }
}

// Usuario autenticado (para saber el owner del fork).
export async function getUsuarioAutenticado() {
  return ghFetch('/user')
}

// ============================================================================
// ESCRITURA (Modo B y Modo C)
// ============================================================================

// Abre un issue en el repo original (Modo B).
export async function crearIssue(owner, repo, { titulo, cuerpo }) {
  return ghFetch(`/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    body: { title: titulo, body: cuerpo },
  })
}

// Fork del repo en la cuenta del usuario (Modo C, paso 1).
export async function forkRepo(owner, repo) {
  return ghFetch(`/repos/${owner}/${repo}/forks`, { method: 'POST' })
}

// SHA del HEAD de una rama (para crear una rama nueva a partir de ella).
export async function getRefSha(owner, repo, rama) {
  const data = await ghFetch(
    `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(rama)}`,
  )
  return data.object.sha
}

// Crea una rama nueva apuntando a un SHA base (Modo C, paso 2).
export async function crearRama(owner, repo, nuevaRama, shaBase) {
  return ghFetch(`/repos/${owner}/${repo}/git/refs`, {
    method: 'POST',
    body: { ref: `refs/heads/${nuevaRama}`, sha: shaBase },
  })
}

// Crea o actualiza un archivo (commit) en una rama (Modo C, paso 5).
export async function commitArchivo(
  owner,
  repo,
  { path, contenido, mensaje, rama, sha },
) {
  return ghFetch(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
    method: 'PUT',
    body: {
      message: mensaje,
      content: encodeBase64Utf8(contenido),
      branch: rama,
      ...(sha ? { sha } : {}),
    },
  })
}

// Abre un PR en el repo original desde la rama del fork (Modo C, paso 7).
// head con formato "usuarioFork:rama" cuando el PR es cross-repo.
export async function crearPR(owner, repo, { titulo, cuerpo, head, base }) {
  return ghFetch(`/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    body: { title: titulo, body: cuerpo, head, base },
  })
}

// Estado de un PR (para polling de notificaciones).
export async function getEstadoPR(owner, repo, numero) {
  const data = await ghFetch(`/repos/${owner}/${repo}/pulls/${numero}`)
  return {
    estado: data.state, // 'open' | 'closed'
    fusionado: Boolean(data.merged_at),
    url: data.html_url,
  }
}

// Cierra un PR (rollback al cancelar en Modo C).
export async function cerrarPR(owner, repo, numero) {
  return ghFetch(`/repos/${owner}/${repo}/pulls/${numero}`, {
    method: 'PATCH',
    body: { state: 'closed' },
  })
}

// Estado de un issue (para polling del Modo B).
export async function getEstadoIssue(owner, repo, numero) {
  const data = await ghFetch(`/repos/${owner}/${repo}/issues/${numero}`)
  return {
    estado: data.state, // 'open' | 'closed'
    razon: data.state_reason, // 'completed' | 'not_planned' | 'reopened' | null
    comentarios: data.comments ?? 0,
    url: data.html_url,
  }
}

// Extrae { owner, repo, numero, tipo } de una URL de PR o issue de GitHub.
export function parsearUrlGithub(url = '') {
  const m = url.match(
    /github\.com\/([^/]+)\/([^/]+)\/(pull|issues)\/(\d+)/,
  )
  if (!m) return null
  return {
    owner: m[1],
    repo: m[2],
    tipo: m[3] === 'pull' ? 'pr' : 'issue',
    numero: Number(m[4]),
  }
}
