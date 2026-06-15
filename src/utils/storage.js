// Manejo centralizado de localStorage: GitHub Token, claves de IA y preferencias.
// Mismo patrón para todos los secretos del usuario — nunca van a Supabase ni al .env.
import {
  IDS_PROVEEDORES,
  esProveedorValido,
  getProveedor,
  PROVEEDOR_DEFAULT,
} from '../services/ai/registry.js'

const KEYS = {
  ghToken: 'gta_github_token',
  ghTokenSource: 'gta_github_token_source', // 'oauth' | 'manual'
  aiProvider: 'gta_ai_provider', // id de proveedor del registry
}

// Claves/modelos de IA por proveedor: prefijo + id del registry.
// Ej: gta_aikey_openai, gta_aimodel_claude.
const aiKeyName = (id) => `gta_aikey_${id}`
const aiModelName = (id) => `gta_aimodel_${id}`

// Claves legadas (modelo dual openai/gemini) → se migran una sola vez.
const LEGACY = {
  openai: 'gta_openai_key',
  gemini: 'gta_gemini_key',
}

// --- helpers internos ---
function get(key) {
  try {
    return localStorage.getItem(key) || ''
  } catch {
    return ''
  }
}

function set(key, value) {
  try {
    if (value === undefined || value === null || value === '') {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, value)
    }
  } catch {
    /* localStorage no disponible: se ignora silenciosamente */
  }
}

// --- GitHub Token ---
// Se obtiene automáticamente del login OAuth (source 'oauth') y puede ser
// sobreescrito por el usuario manualmente (source 'manual', tiene prioridad visual).
export function getGithubToken() {
  return get(KEYS.ghToken)
}

export function getGithubTokenSource() {
  return get(KEYS.ghTokenSource) || ''
}

export function setGithubToken(token, source = 'manual') {
  set(KEYS.ghToken, token)
  set(KEYS.ghTokenSource, token ? source : '')
}

export function clearGithubToken() {
  set(KEYS.ghToken, '')
  set(KEYS.ghTokenSource, '')
}

// Guarda el token que viene del OAuth solo si el usuario no puso uno manual.
// El manual siempre gana hasta que se borre explícitamente.
export function setGithubTokenFromOAuth(token) {
  if (!token) return
  if (getGithubTokenSource() === 'manual' && getGithubToken()) return
  setGithubToken(token, 'oauth')
}

// --- Migración de claves legadas (openai/gemini) → formato genérico ---
// Se ejecuta una vez al cargar el módulo: copia las claves viejas al prefijo
// nuevo si aún no existen, y elimina las antiguas.
let migrado = false
function migrarLegacy() {
  if (migrado) return
  migrado = true
  for (const [id, legacyKey] of Object.entries(LEGACY)) {
    const valor = get(legacyKey)
    if (valor && !get(aiKeyName(id))) {
      set(aiKeyName(id), valor)
    }
    if (valor) set(legacyKey, '') // limpia la clave antigua
  }
}
migrarLegacy()

// --- Claves de IA (genéricas por id de proveedor) ---
export function getAIKey(id) {
  return get(aiKeyName(id))
}
export function setAIKey(id, key) {
  set(aiKeyName(id), key)
}

// --- Modelo elegido por proveedor ---
// Devuelve el modelo guardado o el modeloDefault del registry como fallback.
export function getAIModel(id) {
  const guardado = get(aiModelName(id))
  if (guardado) return guardado
  return getProveedor(id)?.modeloDefault || ''
}
export function setAIModel(id, modelo) {
  set(aiModelName(id), modelo)
}

// --- Proveedor de IA activo ---
// Si no hay preferencia válida guardada, se elige el primer proveedor que tenga clave.
export function getActiveProvider() {
  const stored = get(KEYS.aiProvider)
  if (esProveedorValido(stored)) return stored
  // Auto-selección: primer proveedor con clave configurada.
  const conClave = IDS_PROVEEDORES.find((id) => Boolean(getAIKey(id)))
  return conClave || PROVEEDOR_DEFAULT
}

export function setActiveProvider(provider) {
  if (!esProveedorValido(provider)) return
  set(KEYS.aiProvider, provider)
}

// Devuelve la clave del proveedor actualmente activo (para los servicios de IA).
export function getActiveAIKey() {
  return getAIKey(getActiveProvider())
}

// Devuelve el modelo del proveedor actualmente activo.
export function getActiveAIModel() {
  return getAIModel(getActiveProvider())
}
