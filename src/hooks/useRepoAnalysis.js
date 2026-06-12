import { useState, useCallback } from 'react'
import {
  getReadme,
  getIssuesAbiertos,
  getArbolRaiz,
} from '../services/github.js'
import { analizarRepo, nombreProveedorActivo } from '../services/ai/index.js'

// Hook de análisis: reúne el contexto del repo desde GitHub (README, issues,
// archivos) y lo manda al proveedor de IA activo. Devuelve el análisis de 5
// categorías más estados de carga/error.
export function useRepoAnalysis() {
  const [analisis, setAnalisis] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [proveedor, setProveedor] = useState(null)

  const analizar = useCallback(async (repo) => {
    setCargando(true)
    setError(null)
    setAnalisis(null)
    setProveedor(nombreProveedorActivo())
    try {
      // Contexto del repo en paralelo.
      const [readme, issues, archivos] = await Promise.all([
        getReadme(repo.owner, repo.repo),
        getIssuesAbiertos(repo.owner, repo.repo),
        getArbolRaiz(repo.owner, repo.repo),
      ])

      const resultado = await analizarRepo({
        nombre: repo.nombre,
        descripcion: repo.descripcion,
        lenguaje: repo.lenguaje,
        estrellas: repo.estrellas,
        velocidad: repo.velocidad,
        topics: repo.topics,
        readme,
        issues,
        archivos,
      })

      setAnalisis(resultado)
      setProveedor(NOMBRE_DESDE_CLAVE[resultado._proveedor] || proveedor)
    } catch (e) {
      setError(e.message || 'Falló el análisis con IA')
    } finally {
      setCargando(false)
    }
  }, [])

  const reset = useCallback(() => {
    setAnalisis(null)
    setError(null)
  }, [])

  return { analisis, cargando, error, proveedor, analizar, reset }
}

const NOMBRE_DESDE_CLAVE = { openai: 'OpenAI', gemini: 'Gemini' }
