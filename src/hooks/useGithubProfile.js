import { useState, useEffect } from 'react'
import { getUsuarioAutenticado } from '../services/github.js'
import { getGithubToken } from '../utils/storage.js'

// Carga el perfil público del usuario autenticado desde la GitHub API (/user).
// Solo dispara la llamada si hay token; sin token devuelve perfil null y el
// componente cae al fallback (datos de la sesión OAuth de Supabase).
export function useGithubProfile() {
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(Boolean(getGithubToken()))

  useEffect(() => {
    let activo = true
    if (!getGithubToken()) {
      setCargando(false)
      return
    }
    getUsuarioAutenticado()
      .then((u) => activo && setPerfil(u))
      .catch(() => {})
      .finally(() => activo && setCargando(false))
    return () => {
      activo = false
    }
  }, [])

  return { perfil, cargando }
}
