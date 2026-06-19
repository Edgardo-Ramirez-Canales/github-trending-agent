// Metadata compartida de las categorías de análisis (fuente de verdad).
// La usan SaludRepo, CategorySelector y los Modos A/B/C para: etiquetas, colores,
// grupo, destino (pr | artefacto | lectura), ruta de archivo, contenido generado
// y nombre de rama (Modo C).
//
// Las clases de color se escriben completas (no dinámicas) para que Tailwind
// no las descarte en el build.

const slug = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'cambio'

// Las 11 categorías. `grupo`: 'diagnostico' | 'pr' | 'artefacto'.
// `destino`: 'lectura' | 'pr' | 'artefacto'.
export const CATEGORIAS = [
  {
    clave: 'salud_repo',
    label: 'Salud del repo',
    grupo: 'diagnostico',
    destino: 'lectura',
    requiereModoB: false,
    soloFrontend: false,
    tipoCambio: null,
    artefacto: null,
    chip: 'bg-sky-500/15 text-sky-300',
    barra: 'bg-sky-500',
    anillo: 'ring-sky-500/40',
  },
  {
    clave: 'mejora_docs',
    label: 'Docs',
    grupo: 'pr',
    destino: 'pr',
    requiereModoB: false,
    soloFrontend: false,
    tipoCambio: 'docs',
    artefacto: null,
    chip: 'bg-sky-500/15 text-sky-300',
    barra: 'bg-sky-500',
    anillo: 'ring-sky-500/40',
  },
  {
    clave: 'test_faltante',
    label: 'Tests',
    grupo: 'pr',
    destino: 'pr',
    requiereModoB: false,
    soloFrontend: false,
    tipoCambio: 'test',
    artefacto: null,
    chip: 'bg-emerald-500/15 text-emerald-300',
    barra: 'bg-emerald-500',
    anillo: 'ring-emerald-500/40',
  },
  {
    clave: 'good_first_issue',
    label: 'Good first issue',
    grupo: 'pr',
    destino: 'pr',
    requiereModoB: true,
    soloFrontend: false,
    tipoCambio: 'good_first_issue',
    artefacto: null,
    chip: 'bg-amber-500/15 text-amber-300',
    barra: 'bg-amber-500',
    anillo: 'ring-amber-500/40',
  },
  {
    clave: 'features_faltantes',
    label: 'Features',
    grupo: 'pr',
    destino: 'pr',
    requiereModoB: true,
    soloFrontend: false,
    tipoCambio: 'features',
    artefacto: null,
    chip: 'bg-emerald-500/15 text-emerald-300',
    barra: 'bg-emerald-500',
    anillo: 'ring-emerald-500/40',
  },
  {
    clave: 'fix_pequeno',
    label: 'Fix pequeño',
    grupo: 'pr',
    destino: 'pr',
    requiereModoB: false,
    soloFrontend: false,
    tipoCambio: 'fix',
    artefacto: null,
    chip: 'bg-rose-500/15 text-rose-300',
    barra: 'bg-rose-500',
    anillo: 'ring-rose-500/40',
  },
  {
    clave: 'a11y',
    label: 'Accesibilidad',
    grupo: 'pr',
    destino: 'pr',
    requiereModoB: false,
    soloFrontend: true,
    tipoCambio: 'a11y',
    artefacto: null,
    chip: 'bg-violet-500/15 text-violet-300',
    barra: 'bg-violet-500',
    anillo: 'ring-violet-500/40',
  },
  {
    clave: 'dependencia_obsoleta',
    label: 'Dependencias',
    grupo: 'pr',
    destino: 'pr',
    requiereModoB: false,
    soloFrontend: false,
    tipoCambio: 'deps',
    artefacto: null,
    chip: 'bg-orange-500/15 text-orange-300',
    barra: 'bg-orange-500',
    anillo: 'ring-orange-500/40',
  },
  {
    clave: 'diagrama_arquitectura',
    label: 'Diagrama',
    grupo: 'artefacto',
    destino: 'artefacto',
    requiereModoB: false,
    soloFrontend: false,
    tipoCambio: 'diagrama',
    artefacto: { extension: 'html', mime: 'text/html' },
    chip: 'bg-cyan-500/15 text-cyan-300',
    barra: 'bg-cyan-500',
    anillo: 'ring-cyan-500/40',
  },
  {
    clave: 'skill_plantilla',
    label: 'Skill plantilla',
    grupo: 'artefacto',
    destino: 'artefacto',
    requiereModoB: false,
    soloFrontend: false,
    tipoCambio: 'skill',
    artefacto: { extension: 'md', mime: 'text/markdown' },
    chip: 'bg-fuchsia-500/15 text-fuchsia-300',
    barra: 'bg-fuchsia-500',
    anillo: 'ring-fuchsia-500/40',
  },
  {
    clave: 'onboarding',
    label: 'Onboarding',
    grupo: 'artefacto',
    destino: 'artefacto',
    requiereModoB: false,
    soloFrontend: false,
    tipoCambio: 'onboarding',
    artefacto: { extension: 'md', mime: 'text/markdown' },
    chip: 'bg-teal-500/15 text-teal-300',
    barra: 'bg-teal-500',
    anillo: 'ring-teal-500/40',
  },
]

// Categorías accionables (todo menos el diagnóstico de solo lectura).
export const CATEGORIAS_ACCION = CATEGORIAS.filter((c) => c.grupo !== 'diagnostico')

export const META_POR_CLAVE = Object.fromEntries(CATEGORIAS.map((c) => [c.clave, c]))

// Ruta del archivo que se modificaría/descargaría para una categoría.
export function getArchivoSugerido(clave, datos = {}) {
  switch (clave) {
    case 'mejora_docs':
      return datos.archivo_sugerido || 'README.md'
    case 'test_faltante':
      return datos.archivo_sugerido || 'test/nuevo.test.js'
    case 'good_first_issue':
      return datos.archivo_sugerido || datos.archivo_afectado || 'src/archivo.js'
    case 'features_faltantes':
      return datos.archivo_sugerido || 'src/feature.js'
    case 'fix_pequeno':
      return datos.archivo_afectado || 'src/archivo.js'
    case 'a11y':
      return datos.archivo_afectado || 'src/componente.jsx'
    case 'dependencia_obsoleta':
      return datos.archivo_sugerido || 'package.json'
    case 'diagrama_arquitectura':
      return 'arquitectura.html'
    case 'skill_plantilla':
      return `${slug(datos.nombre_skill) || 'skill'}.md`
    case 'onboarding':
      return 'ONBOARDING.md'
    default:
      return 'CAMBIO.md'
  }
}

// Contenido generado por la IA para esa categoría (lo que se commitea/descarga).
// El diagrama se arma aparte en utils/artefactos.js a partir de nodos/aristas.
export function getContenidoGenerado(clave, datos = {}) {
  switch (clave) {
    case 'mejora_docs':
      return datos.contenido_propuesto || ''
    case 'test_faltante':
    case 'good_first_issue':
    case 'features_faltantes':
    case 'a11y':
      return datos.codigo_propuesto || ''
    case 'fix_pequeno':
      return datos.codigo_refactorizado || ''
    case 'dependencia_obsoleta':
      return datos.contenido_propuesto || ''
    case 'skill_plantilla':
      return datos.contenido_skill || ''
    case 'onboarding':
      return datos.contenido || ''
    default:
      return ''
  }
}

// Nombre de rama descriptivo para el Modo C (solo categorías PR).
export function getNombreRama(clave, datos = {}) {
  switch (clave) {
    case 'mejora_docs':
      return 'docs/mejora-readme'
    case 'test_faltante':
      return `test/${slug(datos.funcion_objetivo)}`
    case 'good_first_issue':
      return `fix/issue-${datos.issue_numero || slug(datos.issue_titulo)}`
    case 'features_faltantes':
      return `feat/${slug(datos.feature_principal)}`
    case 'fix_pequeno':
      return `fix/${slug(datos.tipo)}`
    case 'a11y':
      return 'fix/a11y'
    case 'dependencia_obsoleta':
      return 'chore/deps'
    default:
      return `cambio/${slug(clave)}`
  }
}

export { slug }
