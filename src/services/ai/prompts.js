// Prompt de análisis COMPARTIDO entre OpenAI y Gemini.
// El texto es idéntico para ambos proveedores; cada uno solo cambia el envoltorio
// de la petición (response_format vs responseMimeType). Devuelve siempre el mismo
// JSON de 5 categorías.

// Límites para no disparar el consumo de tokens con repos enormes.
const MAX_README = 6000
const MAX_ISSUES = 20

function recortar(texto, max) {
  if (!texto) return ''
  return texto.length > max ? texto.slice(0, max) + '\n…(recortado)' : texto
}

function formatearIssues(issues = []) {
  if (!issues.length) return '(sin issues abiertos)'
  return issues
    .slice(0, MAX_ISSUES)
    .map(
      (i) =>
        `#${i.numero} ${i.titulo}${
          i.etiquetas?.length ? ` [${i.etiquetas.join(', ')}]` : ''
        }`,
    )
    .join('\n')
}

function formatearArchivos(archivos = []) {
  if (!archivos.length) return '(no disponible)'
  return archivos.map((a) => `${a.nombre}${a.tipo === 'dir' ? '/' : ''}`).join(', ')
}

// Construye el prompt final a partir de los datos del repo.
export function construirPrompt(repo) {
  return `Eres un experto en desarrollo de software, arquitectura de sistemas y estrategia de producto open source.

Analiza el siguiente repositorio de GitHub y genera un análisis estructurado en JSON con exactamente estas 5 categorías:

REPOSITORIO:
- Nombre: ${repo.nombre}
- Descripción: ${repo.descripcion || '(sin descripción)'}
- Lenguaje principal: ${repo.lenguaje || 'N/D'}
- Estrellas totales: ${repo.estrellas}
- Velocidad de crecimiento: ${repo.velocidad ?? 'N/D'} estrellas/día
- Topics: ${repo.topics?.length ? repo.topics.join(', ') : '(sin topics)'}
- README: ${recortar(repo.readme, MAX_README) || '(sin README)'}
- Issues abiertos (primeros 20):
${formatearIssues(repo.issues)}
- Estructura de archivos (nivel raíz): ${formatearArchivos(repo.archivos)}

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:

{
  "features_faltantes": {
    "resumen": "2-3 líneas explicando qué features piden los usuarios",
    "feature_principal": "nombre de la feature más solicitada",
    "archivo_sugerido": "ruta del archivo donde implementarla",
    "codigo_propuesto": "código completo de la implementación",
    "score": 0-10
  },
  "docs_readme": {
    "resumen": "2-3 líneas sobre qué le falta a la documentación",
    "secciones_faltantes": ["lista", "de", "secciones"],
    "archivo_sugerido": "README.md o CONTRIBUTING.md",
    "contenido_propuesto": "contenido completo del archivo mejorado",
    "score": 0-10
  },
  "gap_mercado": {
    "resumen": "2-3 líneas sobre la oportunidad de mercado detectada",
    "competidores": ["lista de competidores"],
    "angulo_unico": "qué tiene este repo que no explotan",
    "propuesta": "contenido completo del ROADMAP.md propuesto",
    "score": 0-10
  },
  "codigo_solid": {
    "resumen": "2-3 líneas sobre la deuda técnica detectada",
    "principio_violado": "SRP | OCP | LSP | ISP | DIP",
    "archivo_afectado": "ruta del archivo con el problema",
    "codigo_refactorizado": "código completo del archivo refactorizado",
    "explicacion_cambios": "explicación de qué se cambió y por qué",
    "score": 0-10
  },
  "score_oportunidad": {
    "puntaje_global": 0-10,
    "categoria_recomendada": "features_faltantes | docs_readme | gap_mercado | codigo_solid",
    "justificacion": "por qué esta categoría primero",
    "orden_sugerido": ["cat1", "cat2", "cat3", "cat4"]
  }
}`
}

// Claves que el JSON debe contener para considerarse válido.
export const CATEGORIAS_REQUERIDAS = [
  'features_faltantes',
  'docs_readme',
  'gap_mercado',
  'codigo_solid',
  'score_oportunidad',
]
