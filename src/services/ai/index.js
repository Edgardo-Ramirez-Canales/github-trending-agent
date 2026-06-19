import {
  getActiveProvider,
  getActiveAIKey,
  getActiveAIModel,
} from '../../utils/storage.js'
import {
  promptModoA,
  promptModoB_pasada1,
  promptModoB_pasada2,
  CATEGORIAS_REQUERIDAS,
} from './prompts.js'
import { PROVEEDORES, getProveedor } from './registry.js'
import { getContenidoArchivos } from '../github.js'

// Servicio unificado de IA. El resto de la app solo llama a analizarRepo();
// aquí se decide el proveedor activo y se intercambia sin lógica condicional fuera.
// Las funciones y nombres se derivan del registry (registry.js) → agregar un
// proveedor nuevo no requiere tocar este archivo.
const NOMBRE = Object.fromEntries(PROVEEDORES.map((p) => [p.id, p.nombre]))

// Valida que el JSON traiga las 11 categorías esperadas.
function validarEstructura(json) {
  if (!json || typeof json !== 'object') {
    throw new Error('La IA no devolvió un objeto JSON')
  }
  const faltantes = CATEGORIAS_REQUERIDAS.filter((k) => !(k in json))
  if (faltantes.length) {
    throw new Error(`Faltan categorías en la respuesta: ${faltantes.join(', ')}`)
  }
}

// Valida la respuesta de la pasada 1 del modo B (lista de archivos a leer).
function validarSolicitud(json) {
  if (!json || !Array.isArray(json.archivos_solicitados)) {
    throw new Error('La IA no devolvió "archivos_solicitados"')
  }
}

// Resuelve proveedor + clave + modelo activos, o lanza error claro.
function resolverProveedor() {
  const proveedorId = getActiveProvider()
  const proveedor = getProveedor(proveedorId)
  if (!proveedor) {
    throw new Error(`Proveedor de IA desconocido: ${proveedorId}`)
  }
  const apiKey = getActiveAIKey()
  if (!apiKey) {
    throw new Error(
      `No hay clave configurada para ${proveedor.nombre}. Añádela en el selector de proveedor de IA.`,
    )
  }
  return { proveedorId, proveedor, apiKey, modelo: getActiveAIModel() }
}

// Pide un JSON al proveedor con reintento único ante fallo de formato.
async function pedirJSON(ctx, prompt, validar) {
  let ultimoError
  for (let intento = 1; intento <= 2; intento++) {
    try {
      const json = await ctx.proveedor.analizar(prompt, ctx.apiKey, ctx.modelo)
      validar(json)
      return json
    } catch (e) {
      ultimoError = e
    }
  }
  throw new Error(
    `${ctx.proveedor.nombre} no devolvió un JSON válido tras 2 intentos: ${ultimoError?.message ?? ''}`,
  )
}

// analizarRepo(contexto, { modo }):
//   modo 'A' (default): una pasada con el contexto ya reunido (incluye archivos).
//   modo 'B': pasada 1 (la IA pide archivos) → se bajan → pasada 2 (análisis final).
// Devuelve el objeto de 11 categorías + el proveedor usado.
export async function analizarRepo(contexto, { modo = 'A' } = {}) {
  const ctx = resolverProveedor()

  let json
  if (modo === 'B') {
    const solicitud = await pedirJSON(
      ctx,
      promptModoB_pasada1(contexto),
      validarSolicitud,
    )
    const paths = solicitud.archivos_solicitados.slice(0, 15)
    const archivos = await getContenidoArchivos(contexto.owner, contexto.repo, paths)
    const contexto2 = { ...contexto, archivos }
    json = await pedirJSON(ctx, promptModoB_pasada2(contexto2), validarEstructura)
  } else {
    json = await pedirJSON(ctx, promptModoA(contexto), validarEstructura)
  }

  return { ...json, _proveedor: ctx.proveedorId }
}

export function nombreProveedorActivo() {
  return NOMBRE[getActiveProvider()] || getActiveProvider()
}
