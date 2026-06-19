// Acciones del panel de seguimiento que tocan GitHub + Supabase a la vez.
// Cada fn cierra/reabre en GitHub y luego refleja el nuevo estado en la DB.
import {
  cerrarPR,
  reabrirPR,
  cerrarIssue,
  reabrirIssue,
  parsearUrlGithub,
} from './github.js'
import {
  actualizarEstadoContribucion,
  borrarContribucion as borrarContribucionDb,
} from './supabase.js'

// Resuelve la referencia GitHub (owner/repo/numero/tipo) de una contribución.
function refDe(c) {
  const ref = parsearUrlGithub(c.url_pr || c.url_issue || '')
  if (!ref) throw new Error('La contribución no tiene una URL de GitHub válida.')
  return ref
}

// Cancela una contribución ABIERTA: cierra el PR/issue en GitHub y la marca
// 'cancelado' en la DB. Solo tiene sentido sobre estado 'abierto'.
export async function cancelarContribucion(c) {
  const ref = refDe(c)
  if (ref.tipo === 'pr') await cerrarPR(ref.owner, ref.repo, ref.numero)
  else await cerrarIssue(ref.owner, ref.repo, ref.numero)
  return actualizarEstadoContribucion(c.id, 'cancelado')
}

// Reabre una contribución CANCELADA: reabre el PR/issue en GitHub y la vuelve
// a 'abierto'. GitHub puede rechazar si el PR ya fue fusionado o la rama se borró.
export async function reabrirContribucion(c) {
  const ref = refDe(c)
  if (ref.tipo === 'pr') await reabrirPR(ref.owner, ref.repo, ref.numero)
  else await reabrirIssue(ref.owner, ref.repo, ref.numero)
  return actualizarEstadoContribucion(c.id, 'abierto')
}

// Borra la contribución del historial (solo DB; el PR/issue en GitHub queda igual).
export async function borrarContribucion(c) {
  return borrarContribucionDb(c.id)
}
