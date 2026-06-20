// Prompts de análisis COMPARTIDOS entre todos los proveedores de IA.
// El texto es idéntico para todos; cada servicio solo cambia el envoltorio.
//
// DOS FASES (rediseño):
//   Fase 1 — promptDiagnostico: 1 pasada ligera. Solo metadata + README + issues
//     + árbol (SIN bajar archivos). Devuelve por categoría aplica/score/resumen +
//     el dato mínimo identificador. NO genera contenido pesado → rápido y no trunca.
//   Fase 2 — promptArchivosCategoria + promptCategoria: ataque a UNA categoría.
//     La IA pide los archivos que necesita, se bajan, y genera el contenido rico
//     (código/manifiesto/skill/diagrama completos) con max_tokens alto.
//
// Regla de idioma: el contenido que aterriza en GitHub se escribe en el idioma del
// repo (contexto.idiomaRepo); las explicaciones para la app SIEMPRE en español.

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

// Bloque de contexto común. incluirArchivos=true añade el contenido real (Fase 2).
function bloqueContexto(contexto, { incluirArchivos = false } = {}) {
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
// Clave: el CÓDIGO sigue el idioma del propio código (inglés por defecto), NUNCA
// el idioma humano del README. Solo la documentación (markdown) respeta el toggle.
function bloqueIdioma(idiomaRepo) {
  const idiomaDocs = idiomaRepo === 'es' ? 'español' : 'inglés'
  return `IDIOMA (respétalo estrictamente):
- CÓDIGO (parches "cambios", "codigo_propuesto"): escribe identificadores, strings, MENSAJES DE ERROR y comentarios EN EL MISMO IDIOMA QUE YA USA EL ARCHIVO (inglés salvo que el archivo claramente use otro). NO traduzcas ni cambies a español el código ni los mensajes existentes; mantener la coherencia del codebase es prioritario.
- DOCUMENTACIÓN (markdown: "seccion_propuesta", "contenido_skill"): escríbela en ${idiomaDocs}.
- Campos EXPLICATIVOS para la app (resumen, justificacion, descripcion_funcional, resumen_funcional, explicacion_cambios, repro, motivo_no_aplica): SIEMPRE en español.`
}

const ROL = `Eres un experto en desarrollo de software, arquitectura de sistemas y contribución open source. Analizas repositorios para proponer aportes pequeños y de alta probabilidad de aceptación (docs, tests, good-first-issues) más artefactos para entenderlos.`

// --- Esquema LIGERO por categoría (Fase 1: diagnóstico, sin contenido pesado) ---
const LIGERO = {
  salud_repo: `"salud_repo": {
    "descripcion_funcional": "2-3 líneas en español: para qué sirve el repo",
    "puntaje_global": 0,
    "factores": {
      "tiene_tests": true, "tiene_ci": true, "tiene_licencia": true,
      "readme_completo": true, "actividad_reciente": true,
      "tiene_contributing": true, "ratio_issues": 0.0
    },
    "justificacion": "en español, por qué ese puntaje"
  }`,
  mejora_docs: `"mejora_docs": { "aplica": true, "motivo_no_aplica": "", "resumen": "ES", "score": 0,
    "secciones_faltantes": ["lista"], "archivo_sugerido": "README.md" }`,
  test_faltante: `"test_faltante": { "aplica": true, "motivo_no_aplica": "", "resumen": "ES", "score": 0,
    "funcion_objetivo": "función pública sin test", "archivo_afectado": "ruta del fuente", "archivo_sugerido": "ruta del test" }`,
  good_first_issue: `"good_first_issue": { "aplica": true, "motivo_no_aplica": "", "resumen": "ES", "score": 0,
    "issue_numero": 0, "issue_titulo": "título del issue elegido", "archivo_afectado": "ruta a tocar" }`,
  features_faltantes: `"features_faltantes": { "aplica": true, "motivo_no_aplica": "", "resumen": "ES", "score": 0,
    "feature_principal": "feature más solicitada", "archivo_sugerido": "ruta donde implementarla" }`,
  fix_pequeno: `"fix_pequeno": { "aplica": true, "motivo_no_aplica": "", "resumen": "ES", "score": 0,
    "tipo": "edge_case | deprecacion | mensaje_error", "repro": "en español: cómo se reproduce", "archivo_afectado": "ruta del archivo" }`,
  a11y: `"a11y": { "aplica": true, "motivo_no_aplica": "", "resumen": "ES", "score": 0,
    "problema": "problema de accesibilidad", "archivo_afectado": "ruta del componente" }`,
  dependencia_obsoleta: `"dependencia_obsoleta": { "aplica": true, "motivo_no_aplica": "", "resumen": "ES", "score": 0,
    "dependencias": [{ "nombre": "", "version_actual": "", "version_sugerida": "" }], "archivo_sugerido": "package.json u otro manifiesto" }`,
}

// Orden de las categorías del diagnóstico (salud + 8 accionables PR).
export const CATEGORIAS_DIAGNOSTICO = [
  'salud_repo',
  'mejora_docs',
  'test_faltante',
  'good_first_issue',
  'features_faltantes',
  'fix_pequeno',
  'a11y',
  'dependencia_obsoleta',
]

// Bloque "cambios" reutilizable para las categorías que EDITAN un archivo existente.
// La IA NO reescribe el archivo: devuelve parches con texto literal a reemplazar.
const CAMBIOS = `"cambios": [
      { "buscar": "fragmento EXACTO y LITERAL del archivo original (cópialo tal cual, varias líneas para que sea único e inequívoco)",
        "reemplazar": "ese mismo fragmento ya corregido/mejorado" }
    ]`

// --- Esquema RICO por categoría (Fase 2: ataque enfocado) ---
// Estrategia por categoría:
//   docs   → "seccion_propuesta": solo la sección a AÑADIR (el código la anexa).
//   tests  → "codigo_propuesto": archivo NUEVO completo (no borra nada).
//   código → "cambios": parches buscar/reemplazar (el código los aplica al original).
const RICO = {
  mejora_docs: `{ "aplica": true, "motivo_no_aplica": "", "resumen": "ES", "score": 0,
    "secciones_faltantes": ["lista"], "archivo_sugerido": "README.md",
    "seccion_propuesta": "markdown de la sección NUEVA o mejorada a AÑADIR al final del README. NO reescribas el archivo entero." }`,
  test_faltante: `{ "aplica": true, "motivo_no_aplica": "", "resumen": "ES", "score": 0,
    "funcion_objetivo": "función pública sin test", "archivo_afectado": "ruta del fuente", "archivo_sugerido": "ruta del test",
    "codigo_propuesto": "código COMPLETO del archivo de test (archivo nuevo)" }`,
  good_first_issue: `{ "aplica": true, "motivo_no_aplica": "", "resumen": "ES", "score": 0,
    "issue_numero": 0, "issue_titulo": "título del issue", "archivo_afectado": "ruta a tocar", "archivo_sugerido": "ruta a modificar",
    "explicacion_cambios": "en español", ${CAMBIOS} }`,
  features_faltantes: `{ "aplica": true, "motivo_no_aplica": "", "resumen": "ES", "score": 0,
    "feature_principal": "feature más solicitada", "archivo_sugerido": "ruta donde implementarla",
    "explicacion_cambios": "en español", ${CAMBIOS} }`,
  fix_pequeno: `{ "aplica": true, "motivo_no_aplica": "", "resumen": "ES", "score": 0,
    "tipo": "edge_case | deprecacion | mensaje_error", "repro": "en español: cómo se reproduce", "archivo_afectado": "ruta del archivo",
    "explicacion_cambios": "en español", ${CAMBIOS} }`,
  a11y: `{ "aplica": true, "motivo_no_aplica": "", "resumen": "ES", "score": 0,
    "problema": "problema de accesibilidad", "archivo_afectado": "ruta del componente",
    "explicacion_cambios": "en español", ${CAMBIOS} }`,
  dependencia_obsoleta: `{ "aplica": true, "motivo_no_aplica": "", "resumen": "ES", "score": 0,
    "dependencias": [{ "nombre": "", "version_actual": "", "version_sugerida": "" }], "archivo_sugerido": "package.json u otro manifiesto",
    "explicacion_cambios": "en español", ${CAMBIOS} }`,
  diagrama_arquitectura: `{ "aplica": true, "motivo_no_aplica": "", "score": 0,
    "resumen_funcional": "en español: qué hace y cómo se organiza",
    "nodos": [{ "id": "auth", "label": "Auth", "grupo": "servicio" }],
    "aristas": [{ "origen": "auth", "destino": "db", "peso": 3 }] }`,
  skill_plantilla: `{ "aplica": true, "motivo_no_aplica": "", "resumen": "ES", "score": 0,
    "nombre_skill": "nombre-kebab-case", "contenido_skill": "contenido COMPLETO del SKILL.md" }`,
}

// Descripción del foco de cada categoría (para el prompt de ataque).
const FOCO = {
  mejora_docs: 'mejorar la documentación (README y docs) del proyecto',
  test_faltante: 'añadir un test para una función pública sin cobertura',
  good_first_issue: 'resolver un issue "good first issue" / "help wanted" del repo',
  features_faltantes: 'implementar la feature más solicitada por la comunidad',
  fix_pequeno: 'corregir un bug pequeño (edge case, deprecación o mensaje de error)',
  a11y: 'corregir un problema de accesibilidad en la UI',
  dependencia_obsoleta: 'actualizar dependencias obsoletas en el manifiesto',
  diagrama_arquitectura: 'generar un diagrama de arquitectura (nodos y aristas) del proyecto',
  skill_plantilla: 'generar una plantilla de SKILL.md reutilizable basada en el proyecto',
}

export const CLAVES_CATEGORIA = Object.keys(RICO)

// --- Fase 1: diagnóstico ligero (una pasada) ---
export function promptDiagnostico(contexto) {
  const esquema = `{\n  ${CATEGORIAS_DIAGNOSTICO.map((k) => LIGERO[k]).join(',\n  ')}\n}`
  return `${ROL}

${bloqueContexto(contexto)}

Haz un DIAGNÓSTICO rápido del repositorio. Para cada categoría accionable, evalúa si hay una oportunidad real: si NO aplica pon "aplica": false y explica por qué en "motivo_no_aplica" (español). NO generes código ni archivos completos todavía: solo el resumen, el score (0-10) y el dato identificador.

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:

${esquema}`
}

// --- Fase 2, pasada 1: la IA pide qué archivos leer para esta categoría ---
export function promptArchivosCategoria(clave, contexto) {
  return `${ROL}

Vas a hacer un análisis profundo enfocado EXCLUSIVAMENTE en: ${FOCO[clave] || clave}.

A continuación tienes la metadata, el README, los issues y la ESTRUCTURA de archivos (sin contenido todavía).

${bloqueContexto(contexto)}

Elige entre 3 y 12 archivos cuyo CONTENIDO necesitas leer para resolver bien esa tarea concreta. Prioriza los archivos directamente relevantes a ${FOCO[clave] || clave}.

Responde ÚNICAMENTE con un JSON válido:

{ "archivos_solicitados": ["ruta/uno.js", "ruta/dos.py"] }`
}

// --- Fase 2, pasada 2: genera el contenido rico de UNA categoría ---
export function promptCategoria(clave, contexto) {
  return `${ROL}

${bloqueIdioma(contexto.idiomaRepo)}

${bloqueContexto(contexto, { incluirArchivos: true })}

Analiza a fondo, apoyándote en el contenido real de los archivos, y produce una propuesta concreta enfocada EXCLUSIVAMENTE en: ${FOCO[clave] || clave}. Si tras leer el código concluyes que no aplica, pon "aplica": false y el motivo.

REGLAS DE CONTENIDO (importantes para no romper el archivo):
- Si el esquema pide "seccion_propuesta": NO reescribas el archivo; devuelve SOLO el bloque nuevo a añadir.
- Si el esquema pide "cambios": NO reescribas el archivo. Por cada modificación, copia en "buscar" un fragmento EXACTO y LITERAL del archivo original (idéntico carácter por carácter, con suficientes líneas para que sea único) y pon en "reemplazar" ese mismo fragmento ya corregido. No inventes texto en "buscar" que no exista en el archivo.
- Si el esquema pide "codigo_propuesto": es un archivo NUEVO; entrégalo completo.

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:

{ "${clave}": ${RICO[clave]} }`
}
