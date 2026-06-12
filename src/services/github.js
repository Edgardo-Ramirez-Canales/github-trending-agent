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

// Fecha ISO de hace N días (para el filtro `created:>` del search).
function fechaHaceDias(dias) {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return d.toISOString().slice(0, 10) // YYYY-MM-DD
}

// Busca repos "trending": creados en los últimos 30 días, con estrellas, ordenados.
// No existe endpoint oficial de trending → se aproxima con el search + velocidad.
export async function buscarTrending({ dias = 30, minEstrellas = 100 } = {}) {
  const q = `created:>${fechaHaceDias(dias)} stars:>${minEstrellas}`
  const path =
    `/search/repositories?q=${encodeURIComponent(q)}` +
    `&sort=stars&order=desc&per_page=60`
  const data = await ghFetch(path)
  const items = data?.items ?? []
  return items.map(normalizarRepo)
}

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
    creadoEn: r.created_at,
    diasVida,
    // Velocidad de crecimiento aproximada: estrellas por día desde su creación.
    velocidad: Math.round((r.stargazers_count / diasVida) * 10) / 10,
  }
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
