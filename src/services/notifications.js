import {
  getContribuciones,
  actualizarEstadoContribucion,
  crearNotificacion,
  marcarEmailEnviado,
  enviarEmailNotificacion,
} from './supabase.js'
import { getEstadoPR, getEstadoIssue, parsearUrlGithub } from './github.js'

// Intervalo de polling: 5 minutos para no abusar de la API de GitHub.
export const POLL_MS = 5 * 60 * 1000

// Revisa el estado de todas las contribuciones abiertas (PRs e issues).
// Si una cambió (cerrada/aceptada/rechazada): actualiza Supabase, crea la
// notificación y dispara el email vía Edge Function. Devuelve nº de cambios.
export async function revisarEstados(email) {
  const abiertas = await getContribuciones({ estado: 'abierto' })
  let cambios = 0

  for (const c of abiertas) {
    try {
      const url = c.url_pr || c.url_issue
      const ref = parsearUrlGithub(url || '')
      if (!ref) continue

      let nuevoEstado = null
      let tipoNotif = null
      let mensaje = null

      if (ref.tipo === 'pr') {
        const st = await getEstadoPR(ref.owner, ref.repo, ref.numero)
        if (st.estado === 'closed') {
          nuevoEstado = st.fusionado ? 'aceptado' : 'rechazado'
          tipoNotif = st.fusionado ? 'pr_aceptado' : 'pr_rechazado'
          mensaje = `Tu PR en ${c.repo} fue ${
            st.fusionado ? 'aceptado (merge) 🎉' : 'cerrado/rechazado'
          }.`
        }
      } else {
        const st = await getEstadoIssue(ref.owner, ref.repo, ref.numero)
        if (st.estado === 'closed') {
          const aceptado = st.razon === 'completed'
          nuevoEstado = aceptado ? 'aceptado' : 'rechazado'
          tipoNotif = 'issue_respondido'
          mensaje = `Tu issue en ${c.repo} fue cerrado (${st.razon || 'sin razón'}).`
        }
      }

      if (!nuevoEstado) continue

      await actualizarEstadoContribucion(c.id, nuevoEstado)
      const notif = await crearNotificacion({
        tipo: tipoNotif,
        mensaje,
        repo: c.repo,
        url,
      })
      cambios++

      // Email best-effort: si falla no rompe el polling.
      if (email) {
        try {
          await enviarEmailNotificacion({
            email,
            repo: c.repo,
            tipo_cambio: c.tipo_cambio,
            estado: nuevoEstado,
            url,
          })
          await marcarEmailEnviado(notif.id)
        } catch {
          /* el email se reintentará en el próximo cambio */
        }
      }
    } catch {
      /* error puntual en una contribución → continuar con las demás */
    }
  }

  return cambios
}
