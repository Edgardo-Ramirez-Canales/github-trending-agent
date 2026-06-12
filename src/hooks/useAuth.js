import { useEffect, useState, useCallback } from 'react'
import {
  getSesionActual,
  onCambioAuth,
  loginConGithub,
  logout,
} from '../services/auth.js'

// Hook de sesión: expone el usuario actual, estado de carga y acciones login/logout.
// Internamente el listener de auth ya captura el provider_token de GitHub a localStorage.
export function useAuth() {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let activo = true

    getSesionActual()
      .then((session) => {
        if (activo) setUsuario(session?.user ?? null)
      })
      .finally(() => {
        if (activo) setCargando(false)
      })

    const desuscribir = onCambioAuth((_event, session) => {
      if (activo) setUsuario(session?.user ?? null)
    })

    return () => {
      activo = false
      desuscribir()
    }
  }, [])

  const login = useCallback(async () => {
    setError(null)
    try {
      await loginConGithub()
    } catch (e) {
      setError(e.message || 'No se pudo iniciar sesión con GitHub')
    }
  }, [])

  const cerrarSesion = useCallback(async () => {
    setError(null)
    try {
      await logout()
      setUsuario(null)
    } catch (e) {
      setError(e.message || 'No se pudo cerrar sesión')
    }
  }, [])

  return { usuario, cargando, error, login, cerrarSesion }
}
