// Prompts de análisis COMPARTIDOS entre todos los proveedores de IA.
// El texto es idéntico para todos; cada servicio solo cambia el envoltorio de la
// petición. Devuelven siempre el mismo JSON de 11 categorías.
//
// Tres constructores:
//   - promptModoA: una sola pasada con el contexto ya reunido.
//   - promptModoB_pasada1: pide a la IA qué archivos quiere leer.
//   - promptModoB_pasada2: análisis final con esos archivos incluidos.
//
// Regla de idioma (clave): el contenido que aterriza en GitHub se escribe en el
// idioma del repo (contexto.idiomaRepo); las explicaciones para la app SIEMPRE
// en español.

const MAX_README = 6000
const MAX_ISSUES = 20
const MAX_ARBOL = 400

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

function formatearArbol(arbol) {
  const paths = Array.isArray(arbol) ? arbol : arbol?.paths || []
  if (!paths.length) return '(no disponible)'
  const lista = paths.slice(0, MAX_ARBOL).map((n) => n.path || n).join('\n')
  return paths.length > MAX_ARBOL ? `${lista}\n…(${paths.length} archivos en total)` : lista
}

function formatearArchivos(archivos = []) {
  if (!archivos.length) return '(no se incluyeron archivos)'
  return archivos
    .map(
      (a) =>
        `--- ${a.path}${a.recortado ? ' (recortado)' : ''} ---\n${a.contenido}`,
    )
    .join('\n\n')
}

// Bloque de contexto común a todos los prompts.
function bloqueContexto(contexto, { incluirArchivos = true } = {}) {
  const m = contexto.meta || {}
  return `REPOSITORIO:
- Nombre: ${m.nombre}
- Descripción: ${m.descripcion || '(sin descripción)'}
- Lenguaje principal: ${m.lenguaje || 'N/D'}
- Estrellas: ${m.estrellas} · Velocidad: ${m.velocidad ?? 'N/D'} estrellas/día
- Topics: ${m.topics?.length ? m.topics.join(', ') : '(sin topics)'}
- README:
${recortar(contexto.readme, MAX_README) || '(sin README)'}

ISSUES ABIERTOS (primeros ${MAX_ISSUES}):
${formatearIssues(contexto.issues)}

ESTRUCTURA DE ARCHIVOS (default branch):
${formatearArbol(contexto.arbol)}
${
  incluirArchivos
    ? `\nCONTENIDO DE ARCHIVOS CLAVE:\n${formatearArchivos(contexto.archivos)}`
    : ''
}`
}

// Instrucción de idioma reutilizable.
function bloqueIdioma(idiomaRepo) {
  const idioma = idiomaRepo === 'es' ? 'español' : 'inglés'
  return `IDIOMA:
- Los campos de CONTENIDO que se publicarán en GitHub (codigo_propuesto, contenido_propuesto, codigo_refactorizado, contenido_skill, contenido) deben escribirse en ${idioma}, incluidos los comentarios de código.
- Los campos EXPLICATIVOS (resumen, justificacion, descripcion_funcional, resumen_funcional, explicacion_cambios, repro, motivo_no_aplica) SIEMPRE en español.`
}

// Esquema JSON de las 11 categorías (texto incrustado en el prompt).
const ESQUEMA_JSON = `{
  "salud_repo": {
    "descripcion_funcional": "2-3 líneas en español: para qué sirve el repo",
    "puntaje_global": 0,
    "factores": {
      "tiene_tests": true,
      "tiene_ci": true,
      "tiene_licencia": true,
      "readme_completo": true,
      "actividad_reciente": true,
      "tiene_contributing": true,
      "ratio_issues": 0.0
    },
    "justificacion": "en español, por qué ese puntaje"
  },
  "mejora_docs": {
    "aplica": true, "motivo_no_aplica": "", "resumen": "ES", "score": 0,
    "secciones_faltantes": ["lista"],
    "archivo_sugerido": "README.md",
    "contenido_propuesto": "contenido completo del archivo mejorado"
  },
  "test_faltante": {
    "aplica": true, "motivo_no_aplica": "", "resumen": "ES", "score": 0,
    "funcion_objetivo": "nombre de la función pública sin test",
    "archivo_afectado": "ruta del archivo fuente",
    "archivo_sugerido": "ruta del archivo de test",
    "codigo_propuesto": "código completo del test"
  },
  "good_first_issue": {
    "aplica": true, "motivo_no_aplica": "", "resumen": "ES", "score": 0,
    "issue_numero": 0,
    "issue_titulo": "título del issue elegido",
    "archivo_afectado": "ruta del archivo a tocar",
    "archivo_sugerido": "ruta del archivo a modificar",
    "codigo_propuesto": "código completo de la solución"
  },
  "features_faltantes": {
    "aplica": true, "motivo_no_aplica": "", "resumen": "ES", "score": 0,
    "feature_principal": "nombre de la feature más solicitada",
    "archivo_sugerido": "ruta donde implementarla",
    "codigo_propuesto": "código completo de la implementación"
  },
  "fix_pequeno": {
    "aplica": true, "motivo_no_aplica": "", "resumen": "ES", "score": 0,
    "tipo": "edge_case | deprecacion | mensaje_error",
    "repro": "en español: cómo se reproduce",
    "archivo_afectado": "ruta del archivo",
    "codigo_refactorizado": "código completo corregido",
    "explicacion_cambios": "en español"
  },
  "a11y": {
    "aplica": true, "motivo_no_aplica": "", "resumen": "ES", "score": 0,
    "problema": "problema de accesibilidad detectado",
    "archivo_afectado": "ruta del componente",
    "codigo_propuesto": "código completo accesible"
  },
  "dependencia_obsoleta": {
    "aplica": true, "motivo_no_aplica": "", "resumen": "ES", "score": 0,
    "dependencias": [{ "nombre": "", "version_actual": "", "version_sugerida": "" }],
    "archivo_sugerido": "package.json u otro manifiesto",
    "contenido_propuesto": "manifiesto completo actualizado"
  },
  "diagrama_arquitectura": {
    "aplica": true, "motivo_no_aplica": "", "score": 0,
    "resumen_funcional": "en español: qué hace y cómo se organiza",
    "nodos": [{ "id": "auth", "label": "Auth", "grupo": "servicio" }],
    "aristas": [{ "origen": "auth", "destino": "db", "peso": 3 }]
  },
  "skill_plantilla": {
    "aplica": true, "motivo_no_aplica": "", "resumen": "ES", "score": 0,
    "nombre_skill": "nombre-kebab-case",
    "contenido_skill": "contenido completo del SKILL.md"
  },
  "onboarding": {
    "aplica": true, "motivo_no_aplica": "", "resumen": "ES", "score": 0,
    "contenido": "markdown completo: por dónde empezar"
  }
}`

const ROL = `Eres un experto en desarrollo de software, arquitectura de sistemas y contribución open source. Analizas repositorios para proponer aportes pequeños y de alta probabilidad de aceptación (docs, tests, good-first-issues) más artefactos para entenderlos.`

// Para categorías que no aplican a este repo, marca "aplica": false y explica
// el motivo en "motivo_no_aplica" (en español). Ej: a11y sin UI, good_first_issue
// sin issues con esos labels.
const REGLA_APLICA = `Para cada categoría accionable, si NO aplica a este repo pon "aplica": false y explica por qué en "motivo_no_aplica" (español). "salud_repo" y "diagrama_arquitectura" usan los campos indicados.`

// --- Modo A: una sola pasada ---
export function promptModoA(contexto) {
  return `${ROL}

${bloqueIdioma(contexto.idiomaRepo)}

${bloqueContexto(contexto)}

${REGLA_APLICA}

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:

${ESQUEMA_JSON}`
}

// --- Modo B, pasada 1: la IA elige qué archivos leer ---
export function promptModoB_pasada1(contexto) {
  return `${ROL}

A continuación tienes la metadata, el README, los issues y la ESTRUCTURA de archivos del repositorio (sin contenido todavía).

${bloqueContexto(contexto, { incluirArchivos: false })}

Antes de analizar, elige entre 5 y 15 archivos cuyo CONTENIDO necesitas leer para hacer un análisis profundo y fiel del proyecto. Prioriza entrypoints, lógica central y los archivos relevantes a los issues.

Responde ÚNICAMENTE con un JSON válido:

{ "archivos_solicitados": ["ruta/uno.js", "ruta/dos.py"] }`
}

// --- Modo B, pasada 2: análisis final con los archivos solicitados incluidos ---
export function promptModoB_pasada2(contexto) {
  return `${ROL}

${bloqueIdioma(contexto.idiomaRepo)}

${bloqueContexto(contexto)}

${REGLA_APLICA}

Haz un análisis profundo apoyándote en el contenido real de los archivos. Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:

${ESQUEMA_JSON}`
}

// Claves que el JSON debe contener para considerarse válido.
export const CATEGORIAS_REQUERIDAS = [
  'salud_repo',
  'mejora_docs',
  'test_faltante',
  'good_first_issue',
  'features_faltantes',
  'fix_pequeno',
  'a11y',
  'dependencia_obsoleta',
  'diagrama_arquitectura',
  'skill_plantilla',
  'onboarding',
]
