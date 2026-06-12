import { useState, useEffect, useCallback } from 'react'
import { buscarTrending } from '../services/github.js'
import { getReposVistosRecientes } from '../services/supabase.js'

const UMBRAL_LLAMAS = 3000 // estrellas ganadas para que un repo visto reaparezca

// Carga repos trending de GitHub, cruza con los repos ya vistos (Supabase) y:
//  - filtra los vistos en los últimos 7 días…
//  - …salvo que hayan ganado +3000 estrellas → reaparecen con badge "en llamas".
export function useTrendingRepos() {
  const [repos, setRepos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      // Trending + vistos en paralelo (vistos puede fallar si no hay sesión aún).
      const [trending, vistos] = await Promise.all([
        buscarTrending({ dias: 30, minEstrellas: 100 }),
        getReposVistosRecientes(7).catch(() => []),
      ])

      const mapaVistos = new Map(vistos.map((v) => [v.nombre, v]))

      const procesados = []
      for (const r of trending) {
        const visto = mapaVistos.get(r.nombre)
        if (!visto) {
          procesados.push({ ...r, enLlamas: false, diffEstrellas: 0 })
          continue
        }
        const diff = r.estrellas - visto.estrellas_al_verlo
        const umbral = visto.umbral_reaparicion ?? UMBRAL_LLAMAS
        if (diff >= umbral) {
          // Visto pero en crecimiento explosivo → reaparece marcado.
          procesados.push({ ...r, enLlamas: true, diffEstrellas: diff })
        }
        // Visto recientemente y sin crecimiento explosivo → se omite.
      }

      setRepos(procesados)
    } catch (e) {
      setError(e.message || 'No se pudieron cargar los repos trending')
      setRepos([])
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  return { repos, cargando, error, recargar: cargar }
}
