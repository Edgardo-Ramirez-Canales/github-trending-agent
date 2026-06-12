import { createClient } from '@supabase/supabase-js'

// Cliente único de Supabase. Se inicializa antes que cualquier componente que lo use.
// La key usa el formato nuevo `sb_publishable_...` (reemplaza a la antigua anon key).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  // Aviso temprano en consola para no fallar silenciosamente si falta el .env.
  console.error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el .env. Copia .env.example a .env y rellénalo.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// ============================================================================
// Queries — tabla repos_vistos
// El user_id se rellena solo (DEFAULT auth.uid()) y RLS limita todo al dueño.
// ============================================================================

// Repos vistos en los últimos N días (default 7), para filtrar la lista trending.
export async function getReposVistosRecientes(dias = 7) {
  const desde = new Date()
  desde.setDate(desde.getDate() - dias)
  const { data, error } = await supabase
    .from('repos_vistos')
    .select('nombre, estrellas_al_verlo, fecha_vista, umbral_reaparicion')
    .gte('fecha_vista', desde.toISOString())
  if (error) throw error
  return data ?? []
}

// Registra un repo como visto (al abrir su detalle). user_id automático por RLS.
export async function registrarRepoVisto({ nombre, estrellas }) {
  const { data, error } = await supabase
    .from('repos_vistos')
    .insert({ nombre, estrellas_al_verlo: estrellas })
    .select()
    .single()
  if (error) throw error
  return data
}

// ============================================================================
// Queries — tabla contribuciones
// ============================================================================

// Registra una contribución (issue del Modo B o PR del Modo C).
export async function registrarContribucion({
  repo,
  rama = null,
  tipo_cambio,
  modo,
  url_pr = null,
  url_issue = null,
  estado = 'abierto',
  categorias = null,
}) {
  const { data, error } = await supabase
    .from('contribuciones')
    .insert({
      repo,
      rama,
      tipo_cambio,
      modo,
      url_pr,
      url_issue,
      estado,
      categorias,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// Contribuciones del usuario (todas o filtradas por estado).
export async function getContribuciones({ estado } = {}) {
  let q = supabase
    .from('contribuciones')
    .select('*')
    .order('fecha_creacion', { ascending: false })
  if (estado) q = q.eq('estado', estado)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

// Actualiza el estado de una contribución (al detectar aceptado/rechazado/cancelado).
export async function actualizarEstadoContribucion(id, estado) {
  const { data, error } = await supabase
    .from('contribuciones')
    .update({ estado })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ============================================================================
// Queries — tabla notificaciones
// ============================================================================

export async function getNotificaciones() {
  const { data, error } = await supabase
    .from('notificaciones')
    .select('*')
    .order('fecha', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function crearNotificacion({ tipo, mensaje, repo, url = null }) {
  const { data, error } = await supabase
    .from('notificaciones')
    .insert({ tipo, mensaje, repo, url })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function marcarNotificacionLeida(id) {
  const { error } = await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('id', id)
  if (error) throw error
}

export async function marcarTodasLeidas() {
  const { error } = await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('leida', false)
  if (error) throw error
}

export async function marcarEmailEnviado(id) {
  const { error } = await supabase
    .from('notificaciones')
    .update({ email_enviado: true })
    .eq('id', id)
  if (error) throw error
}

// Invoca la Edge Function que envía el email vía Resend.
export async function enviarEmailNotificacion(payload) {
  const { data, error } = await supabase.functions.invoke('notify-pr-status', {
    body: payload,
  })
  if (error) throw error
  return data
}
