// Heurística de selección de archivos para el contexto de la IA (modo A).
// A partir del árbol recursivo del repo, elige entre 5 y 15 archivos que mejor
// revelan la "esencia" del proyecto, priorizando:
//   1. Entrypoints por convención (index/main/app, raíz de src/).
//   2. Config / manifiesto (package.json, requirements.txt, etc.).
//   3. Archivos mencionados explícitamente en el README o en los issues.
// Respeta un presupuesto total (~150 KB) usando el tamaño de cada blob, y cuenta
// como mucho 30 KB por archivo (lo que luego se baja recortado).

const MIN_ARCHIVOS = 5
const MAX_ARCHIVOS = 15
const TOPE_TOTAL = 150_000
const TOPE_ARCHIVO = 30_000

// Manifiestos de dependencias / build por ecosistema.
const MANIFIESTOS = new Set([
  'package.json', 'requirements.txt', 'pyproject.toml', 'setup.py',
  'go.mod', 'cargo.toml', 'composer.json', 'gemfile', 'build.gradle',
  'pom.xml', 'tsconfig.json', 'pubspec.yaml', 'csproj',
])

// Nombres base que suelen ser el punto de entrada del proyecto.
const ENTRYPOINTS = ['index', 'main', 'app', 'server', 'cli']
const EXT_CODIGO = /\.(js|jsx|ts|tsx|py|go|rs|java|rb|php|c|cpp|cs|kt|swift|vue|svelte)$/i

const nombreBase = (path) => path.split('/').pop().toLowerCase()
const profundidad = (path) => path.split('/').length

// ¿El nombre del archivo es un entrypoint por convención?
function esEntrypoint(path) {
  const base = nombreBase(path)
  if (!EXT_CODIGO.test(base)) return false
  const sinExt = base.replace(EXT_CODIGO, '')
  return ENTRYPOINTS.includes(sinExt)
}

// ¿Es un manifiesto de dependencias/build?
function esManifiesto(path) {
  const base = nombreBase(path)
  return MANIFIESTOS.has(base) || base.endsWith('.csproj')
}

// ¿El path (o su nombre) aparece mencionado en algún texto?
function esMencionado(path, textos) {
  const base = nombreBase(path)
  return textos.some((t) => t.includes(path) || t.includes(base))
}

// Devuelve un array de paths (5-15) elegidos del árbol.
// `arbol` puede ser el objeto { paths } de getArbolRecursivo o el array directo.
export function elegirArchivos(arbol, readme = '', issues = []) {
  const paths = Array.isArray(arbol) ? arbol : arbol?.paths || []
  if (!paths.length) return []

  const textos = [
    (readme || '').toLowerCase(),
    ...issues.map((i) => `${i.titulo || ''} ${i.cuerpo || ''}`.toLowerCase()),
  ]

  // Puntúa cada archivo: mayor puntaje = más relevante.
  const puntuado = paths
    .filter((n) => EXT_CODIGO.test(n.path) || esManifiesto(n.path))
    .map((n) => {
      let puntaje = 0
      if (esEntrypoint(n.path)) puntaje += 100
      if (esManifiesto(n.path)) puntaje += 80
      if (esMencionado(n.path, textos)) puntaje += 60
      if (n.path.startsWith('src/')) puntaje += 20
      puntaje -= profundidad(n.path) // archivos menos anidados primero
      return { ...n, puntaje }
    })
    .sort((a, b) => b.puntaje - a.puntaje)

  // Llena hasta MAX respetando el presupuesto total.
  const elegidos = []
  let total = 0
  for (const n of puntuado) {
    if (elegidos.length >= MAX_ARCHIVOS) break
    const costo = Math.min(n.tamano || TOPE_ARCHIVO, TOPE_ARCHIVO)
    if (total + costo > TOPE_TOTAL && elegidos.length >= MIN_ARCHIVOS) continue
    elegidos.push(n.path)
    total += costo
  }

  return elegidos
}
