import { useState, useEffect, useCallback } from 'react'
import {
  buscarRepos,
  buscarRepoNormalizado,
  parsearRepoUrl,
} from '../services/github.js'
import { getReposVistosRecientes } from '../services/supabase.js'

const UMBRAL_LLAMAS = 3000 // estrellas ganadas para que un repo visto reaparezca

// Carga repos de GitHub según el modo y cruza con los repos ya vistos (Supabase).
//
// Regla de "vistos" (refinada en Fase 2): separamos dos efectos antes mezclados:
//   - MARCAR "en llamas": un repo ya visto que ganó +umbral estrellas se marca.
//     Esto SIEMPRE se calcula, en cualquier modo.
//   - OCULTAR vistos: esconder los vistos en los últimos 7 días.
//     Solo aplica en modo 'trending' Y cuando incluirVistos === false.
//     En modos 'repo' y 'usuario' nunca se oculta (la búsqueda es deliberada).
//
// Filtros aceptados (todos opcionales; los defaults reproducen el comportamiento
// previo exacto: modo trending, 30 días, 100 estrellas, sin incluir vistos):
//   { modo, dias, minEstrellas, incluirVistos, usuario, urlRepo,
//     fecha, maxEstrellas, pushedDesde, lenguaje, sort, order }
export function useTrendingRepos(filtros = {}) {
  const {
    modo = 'trending',
    dias = 30,
    minEstrellas = 100,
    incluirVistos = false,
    usuario = '',
    urlRepo = '',
    // Filtros de servidor adicionales (los usa el motor de Fase 1).
    fecha,
    maxEstrellas,
    pushedDesde,
    lenguaje,
    sort,
    order,
  } = filtros

  const [repos, setRepos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  // Trae el conjunto base de repos según el modo (sin aplicar regla de vistos).
  const traerBase = useCallback(async () => {
    if (modo === 'repo') {
      if (!urlRepo.trim()) return [] // sin entrada aún: lista vacía, sin error
      const parsed = parsearRepoUrl(urlRepo)
      if (!parsed) throw new Error('URL de repo inválida. Usá owner/repo o github.com/owner/repo')
      const repo = await buscarRepoNormalizado(parsed.owner, parsed.repo)
      if (!repo) throw new Error(`No se encontró el repo ${parsed.owner}/${parsed.repo}`)
      return [repo]
    }
    if (modo === 'usuario') {
      if (!usuario.trim()) return []
      // Sin piso de estrellas: queremos ver todos los repos del usuario.
      return buscarRepos({ modo: 'usuario', usuario, fecha, pushedDesde, lenguaje, sort, order })
    }
    // 'trending': motor flexible con fecha (preset/personalizado) y, si no se
    // eligió fecha, fallback a "últimos `dias`". Piso de estrellas del servidor
    // = minEstrellas (default 100); el slider de la UI filtra encima en cliente.
    return buscarRepos({ modo: 'trending', fecha, dias, minEstrellas, pushedDesde, lenguaje, sort, order })
  }, [modo, urlRepo, usuario, dias, minEstrellas, pushedDesde, lenguaje, sort, order, fecha])

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      // Base + vistos en paralelo (vistos puede fallar si no hay sesión aún).
      const [base, vistos] = await Promise.all([
        traerBase(),
        getReposVistosRecientes(7).catch(() => []),
      ])

      const mapaVistos = new Map(vistos.map((v) => [v.nombre, v]))

      // ¿Ocultamos los vistos? Solo en trending y sin el toggle activo.
      const ocultar = modo === 'trending' && !incluirVistos

      const procesados = []
      for (const r of base) {
        const visto = mapaVistos.get(r.nombre)
        // Marcar "en llamas" SIEMPRE que el repo esté visto y haya crecido.
        let enLlamas = false
        let diffEstrellas = 0
        if (visto) {
          const diff = r.estrellas - visto.estrellas_al_verlo
          const umbral = visto.umbral_reaparicion ?? UMBRAL_LLAMAS
          diffEstrellas = diff
          enLlamas = diff >= umbral
        }

        // Ocultar: solo si corresponde, el repo está visto y NO está en llamas.
        if (ocultar && visto && !enLlamas) continue

        procesados.push({ ...r, enLlamas, diffEstrellas })
      }

      setRepos(procesados)
    } catch (e) {
      setError(e.message || 'No se pudieron cargar los repos')
      setRepos([])
    } finally {
      setCargando(false)
    }
  }, [traerBase, modo, incluirVistos])

  useEffect(() => {
    cargar()
  }, [cargar])

  return { repos, cargando, error, recargar: cargar }
}
