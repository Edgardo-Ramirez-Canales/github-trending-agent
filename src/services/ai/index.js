import {
  getActiveProvider,
  getActiveAIKey,
  getActiveAIModel,
} from '../../utils/storage.js'
import { construirPrompt, CATEGORIAS_REQUERIDAS } from './prompts.js'
import { PROVEEDORES, getProveedor } from './registry.js'

// Servicio unificado de IA. El resto de la app solo llama a analizarRepo();
// aquí se decide el proveedor activo y se intercambia sin lógica condicional fuera.
// Las funciones y nombres se derivan del registry (registry.js) → agregar un
// proveedor nuevo no requiere tocar este archivo.
const NOMBRE = Object.fromEntries(PROVEEDORES.map((p) => [p.id, p.nombre]))

// Valida que el JSON traiga las categorías esperadas.
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
//   → lee proveedor activo + su clave + su modelo (localStorage)
//   → arma el prompt compartido
//   → llama al proveedor; si el parseo/estructura falla, reintenta UNA vez
//   → devuelve el objeto de categorías + el proveedor usado
export async function analizarRepo(repoData) {
  const proveedorId = getActiveProvider()
  const apiKey = getActiveAIKey()
  const modelo = getActiveAIModel()
  const proveedor = getProveedor(proveedorId)

  if (!proveedor) {
    throw new Error(`Proveedor de IA desconocido: ${proveedorId}`)
  }

  if (!apiKey) {
    throw new Error(
      `No hay clave configurada para ${proveedor.nombre}. Añádela en el selector de proveedor de IA.`,
    )
  }

  const prompt = construirPrompt(repoData)

  let ultimoError
  for (let intento = 1; intento <= 2; intento++) {
    try {
      const json = await proveedor.analizar(prompt, apiKey, modelo)
      validarEstructura(json)
      return { ...json, _proveedor: proveedorId }
    } catch (e) {
      ultimoError = e
      // Reintento solo si fue fallo de formato/estructura (no de red/clave).
    }
  }

  throw new Error(
    `${proveedor.nombre} no devolvió un análisis válido tras 2 intentos: ${ultimoError?.message ?? ''}`,
  )
}

export function nombreProveedorActivo() {
  return NOMBRE[getActiveProvider()] || getActiveProvider()
}
