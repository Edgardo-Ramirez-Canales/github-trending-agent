// Manejo centralizado de localStorage: GitHub Token, claves de IA y preferencias.
// Mismo patrón para todos los secretos del usuario — nunca van a Supabase ni al .env.

const KEYS = {
  ghToken: 'gta_github_token',
  ghTokenSource: 'gta_github_token_source', // 'oauth' | 'manual'
  openaiKey: 'gta_openai_key',
  geminiKey: 'gta_gemini_key',
  aiProvider: 'gta_ai_provider', // 'openai' | 'gemini'
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

// --- Claves de IA ---
export function getOpenAIKey() {
  return get(KEYS.openaiKey)
}
export function setOpenAIKey(key) {
  set(KEYS.openaiKey, key)
}
export function getGeminiKey() {
  return get(KEYS.geminiKey)
}
export function setGeminiKey(key) {
  set(KEYS.geminiKey, key)
}

// --- Proveedor de IA activo ---
// Si no hay preferencia guardada, se elige automáticamente la única clave disponible.
export function getActiveProvider() {
  const stored = get(KEYS.aiProvider)
  if (stored === 'openai' || stored === 'gemini') return stored
  // Auto-selección: si solo hay una clave, esa queda activa.
  const hasOpenAI = Boolean(getOpenAIKey())
  const hasGemini = Boolean(getGeminiKey())
  if (hasOpenAI && !hasGemini) return 'openai'
  if (hasGemini && !hasOpenAI) return 'gemini'
  return hasOpenAI ? 'openai' : 'gemini'
}

export function setActiveProvider(provider) {
  if (provider !== 'openai' && provider !== 'gemini') return
  set(KEYS.aiProvider, provider)
}

// Devuelve la clave del proveedor actualmente activo (para los servicios de IA).
export function getActiveAIKey() {
  return getActiveProvider() === 'openai' ? getOpenAIKey() : getGeminiKey()
}
