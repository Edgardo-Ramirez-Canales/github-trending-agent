import { useState, useEffect, useCallback } from 'react'
import {
  getContribuciones,
  getNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas,
} from '../services/supabase.js'
import { revisarEstados, POLL_MS } from '../services/notifications.js'

// Gestiona contribuciones + notificaciones: carga inicial, polling de estados
// cada 5 min (y al abrir la app) y acciones de marcar como leída.
export function useContributions(email) {
  const [contribuciones, setContribuciones] = useState([])
  const [notificaciones, setNotificaciones] = useState([])
  const [cargando, setCargando] = useState(true)

  const noLeidas = notificaciones.filter((n) => !n.leida).length

  const refrescar = useCallback(async () => {
    try {
      const [c, n] = await Promise.all([getContribuciones(), getNotificaciones()])
      setContribuciones(c)
      setNotificaciones(n)
    } catch {
      /* sin sesión / sin tablas: se ignora */
    } finally {
      setCargando(false)
    }
  }, [])

  const revisarAhora = useCallback(async () => {
    const cambios = await revisarEstados(email).catch(() => 0)
    if (cambios > 0) await refrescar()
    return cambios
  }, [email, refrescar])

  useEffect(() => {
    refrescar()
    revisarAhora() // chequeo al abrir la app
    const id = setInterval(revisarAhora, POLL_MS)
    return () => clearInterval(id)
  }, [refrescar, revisarAhora])

  const marcarLeida = useCallback(async (id) => {
    await marcarNotificacionLeida(id).catch(() => {})
    setNotificaciones((p) => p.map((n) => (n.id === id ? { ...n, leida: true } : n)))
  }, [])

  const marcarTodas = useCallback(async () => {
    await marcarTodasLeidas().catch(() => {})
    setNotificaciones((p) => p.map((n) => ({ ...n, leida: true })))
  }, [])

  return {
    contribuciones,
    notificaciones,
    noLeidas,
    cargando,
    refrescar,
    revisarAhora,
    marcarLeida,
    marcarTodas,
  }
}
