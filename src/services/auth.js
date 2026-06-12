import { supabase } from './supabase.js'
import { setGithubTokenFromOAuth } from '../utils/storage.js'

// Servicio de autenticación con GitHub OAuth (Supabase Auth).
// El login pide scope `public_repo` → GitHub devuelve un provider_token con
// permiso para fork + commit + PR en repos públicos. Ese token se captura UNA
// vez en el evento SIGNED_IN (Supabase NO lo persiste) y se guarda en localStorage.

const GITHUB_SCOPES = 'public_repo'

// Inicia el flujo OAuth con GitHub. Redirige fuera de la app y vuelve al callback.
export async function loginConGithub() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      scopes: GITHUB_SCOPES,
      redirectTo: window.location.origin,
    },
  })
  if (error) throw error
}

export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSesionActual() {
  const { data } = await supabase.auth.getSession()
  return data.session ?? null
}

// Suscribe a cambios de sesión. CRÍTICO: el provider_token solo está disponible
// en el momento de SIGNED_IN; aquí se atrapa y se persiste antes de que se pierda.
// Devuelve la función para desuscribirse.
export function onCambioAuth(callback) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.provider_token) {
      setGithubTokenFromOAuth(session.provider_token)
    }
    callback(event, session)
  })
  return () => data.subscription.unsubscribe()
}
