import {
  getActiveProvider,
  getActiveAIKey,
  getActiveAIModel,
} from '../../utils/storage.js'
import {
  promptDiagnostico,
  promptArchivosCategoria,
  promptCategoria,
  CATEGORIAS_DIAGNOSTICO,
} from './prompts.js'
import { PROVEEDORES, getProveedor } from './registry.js'
import { getContenidoArchivos } from '../github.js'

// Servicio unificado de IA en DOS FASES:
//   analizarRepo(contexto)          → diagnóstico ligero (todas las categorías, sin contenido pesado)
//   analizarCategoria(contexto,clave) → ataque enfocado a 1 categoría (2 pasadas, contenido completo)
// El proveedor activo se resuelve del registry → agregar uno nuevo no toca este archivo.
const NOMBRE = Object.fromEntries(PROVEEDORES.map((p) => [p.id, p.nombre]))

// Tope de tokens de salida. Diagnóstico es corto; el ataque genera archivos completos.
const MAX_TOKENS_DIAGNOSTICO = 4096
const MAX_TOKENS_CATEGORIA = 8000 // techo seguro para todos los modelos (Haiku = 8192)

// Valida que el diagnóstico traiga las categorías esperadas.
function validarDiagnostico(json) {
  if (!json || typeof json !== 'object') {
    throw new Error('La IA no devolvió un objeto JSON')
  }
  const faltantes = CATEGORIAS_DIAGNOSTICO.filter((k) => !(k in json))
  if (faltantes.length) {
    throw new Error(`Faltan categorías en el diagnóstico: ${faltantes.join(', ')}`)
  }
}

// Valida la respuesta de la pasada 1 (lista de archivos a leer).
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
async function pedirJSON(ctx, prompt, validar, maxTokens) {
  let ultimoError
  for (let intento = 1; intento <= 2; intento++) {
    try {
      const json = await ctx.proveedor.analizar(prompt, ctx.apiKey, ctx.modelo, maxTokens)
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

// Fase 1 — diagnóstico ligero de todas las categorías (1 pasada, sin archivos).
export async function analizarRepo(contexto) {
  const ctx = resolverProveedor()
  const json = await pedirJSON(
    ctx,
    promptDiagnostico(contexto),
    validarDiagnostico,
    MAX_TOKENS_DIAGNOSTICO,
  )
  return { ...json, _proveedor: ctx.proveedorId }
}

// Fase 2 — ataque enfocado a UNA categoría:
//   pasada 1: la IA pide los archivos que necesita → se bajan
//   pasada 2: genera el contenido rico (código/manifiesto/skill/diagrama completos)
// Devuelve el objeto de esa categoría (campos listos para merge en analisis[clave]).
export async function analizarCategoria(contexto, clave) {
  const ctx = resolverProveedor()

  const solicitud = await pedirJSON(
    ctx,
    promptArchivosCategoria(clave, contexto),
    validarSolicitud,
    MAX_TOKENS_DIAGNOSTICO,
  )
  const paths = solicitud.archivos_solicitados.slice(0, 12)
  const archivos = await getContenidoArchivos(contexto.owner, contexto.repo, paths)

  const contexto2 = { ...contexto, archivos }
  const json = await pedirJSON(
    ctx,
    promptCategoria(clave, contexto2),
    (j) => {
      if (!j || typeof j !== 'object') throw new Error('La IA no devolvió un objeto JSON')
    },
    MAX_TOKENS_CATEGORIA,
  )
  // El prompt pide { [clave]: {...} }; aceptamos también el objeto plano.
  return json[clave] && typeof json[clave] === 'object' ? json[clave] : json
}

export function nombreProveedorActivo() {
  return NOMBRE[getActiveProvider()] || getActiveProvider()
}
