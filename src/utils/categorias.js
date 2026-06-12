// Metadata compartida de las categorías de oportunidad.
// La usan AnalysisPanel y los Modos A/B/C para: etiquetas, colores, ruta de
// archivo a modificar, contenido generado por la IA y nombre de rama (Modo C).
//
// Las clases de color se escriben completas (no dinámicas) para que Tailwind
// no las descarte en el build.

const slug = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'cambio'

// Las 4 categorías accionables (la 5ª, score_oportunidad, es solo lectura).
export const CATEGORIAS_ACCION = [
  {
    clave: 'features_faltantes',
    label: 'Features faltantes',
    tipoCambio: 'features',
    chip: 'bg-emerald-500/15 text-emerald-300',
    barra: 'bg-emerald-500',
    anillo: 'ring-emerald-500/40',
  },
  {
    clave: 'docs_readme',
    label: 'Docs / README',
    tipoCambio: 'docs',
    chip: 'bg-sky-500/15 text-sky-300',
    barra: 'bg-sky-500',
    anillo: 'ring-sky-500/40',
  },
  {
    clave: 'gap_mercado',
    label: 'Gap de mercado',
    tipoCambio: 'mercado',
    chip: 'bg-violet-500/15 text-violet-300',
    barra: 'bg-violet-500',
    anillo: 'ring-violet-500/40',
  },
  {
    clave: 'codigo_solid',
    label: 'Código / SOLID',
    tipoCambio: 'codigo',
    chip: 'bg-amber-500/15 text-amber-300',
    barra: 'bg-amber-500',
    anillo: 'ring-amber-500/40',
  },
]

export const META_POR_CLAVE = Object.fromEntries(
  CATEGORIAS_ACCION.map((c) => [c.clave, c]),
)

// Ruta del archivo que se modificaría para una categoría.
export function getArchivoSugerido(clave, datos = {}) {
  switch (clave) {
    case 'features_faltantes':
      return datos.archivo_sugerido || 'src/feature.js'
    case 'docs_readme':
      return datos.archivo_sugerido || 'README.md'
    case 'gap_mercado':
      return 'ROADMAP.md'
    case 'codigo_solid':
      return datos.archivo_afectado || 'src/archivo.js'
    default:
      return 'CAMBIO.md'
  }
}

// Contenido generado por la IA para esa categoría (lo que se commitea en Modo C).
export function getContenidoGenerado(clave, datos = {}) {
  switch (clave) {
    case 'features_faltantes':
      return datos.codigo_propuesto || ''
    case 'docs_readme':
      return datos.contenido_propuesto || ''
    case 'gap_mercado':
      return datos.propuesta || ''
    case 'codigo_solid':
      return datos.codigo_refactorizado || ''
    default:
      return ''
  }
}

// Nombre de rama descriptivo para el Modo C.
export function getNombreRama(clave, datos = {}) {
  switch (clave) {
    case 'features_faltantes':
      return `feat/${slug(datos.feature_principal)}`
    case 'docs_readme':
      return 'docs/mejora-readme'
    case 'gap_mercado':
      return 'docs/roadmap-propuesta'
    case 'codigo_solid':
      return `refactor/${slug(datos.principio_violado + '-solid')}`
    default:
      return `cambio/${slug(clave)}`
  }
}

export { slug }
