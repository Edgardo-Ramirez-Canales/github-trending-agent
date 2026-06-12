import { getActiveProvider, getActiveAIKey } from '../../utils/storage.js'
import { construirPrompt, CATEGORIAS_REQUERIDAS } from './prompts.js'
import { analizar as analizarOpenAI } from './openai.js'
import { analizar as analizarGemini } from './gemini.js'

// Servicio unificado de IA. El resto de la app solo llama a analizarRepo();
// aquí se decide el proveedor activo y se intercambia sin lógica condicional fuera.
const PROVEEDORES = {
  openai: analizarOpenAI,
  gemini: analizarGemini,
}

const NOMBRE = { openai: 'OpenAI', gemini: 'Gemini' }

// Valida que el JSON traiga las 5 categorías esperadas.
function validarEstructura(json) {
  if (!json || typeof json !== 'object') {
    throw new Error('La IA no devolvió un objeto JSON')
  }
  const faltantes = CATEGORIAS_REQUERIDAS.filter((k) => !(k in json))
  if (faltantes.length) {
    throw new Error(`Faltan categorías en la respuesta: ${faltantes.join(', ')}`)
  }
}

// analizarRepo(repoData):
//   → lee proveedor activo + su clave (localStorage)
//   → arma el prompt compartido
//   → llama al proveedor; si el parseo/estructura falla, reintenta UNA vez
//   → devuelve el objeto de 5 categorías + el proveedor usado
export async function analizarRepo(repoData) {
  const proveedor = getActiveProvider()
  const apiKey = getActiveAIKey()

  if (!apiKey) {
    throw new Error(
      `No hay clave configurada para ${NOMBRE[proveedor]}. Añádela en el selector de proveedor de IA.`,
    )
  }

  const fn = PROVEEDORES[proveedor]
  const prompt = construirPrompt(repoData)

  let ultimoError
  for (let intento = 1; intento <= 2; intento++) {
    try {
      const json = await fn(prompt, apiKey)
      validarEstructura(json)
      return { ...json, _proveedor: proveedor }
    } catch (e) {
      ultimoError = e
      // Reintento solo si fue fallo de formato/estructura (no de red/clave).
    }
  }

  throw new Error(
    `${NOMBRE[proveedor]} no devolvió un análisis válido tras 2 intentos: ${ultimoError?.message ?? ''}`,
  )
}

export function nombreProveedorActivo() {
  return NOMBRE[getActiveProvider()]
}
