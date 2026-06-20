import { useCallback, useRef, useState } from 'react'
import {
  getReadme,
  getIssuesAbiertos,
  getIssuesPorLabel,
  getArbolRecursivo,
} from '../services/github.js'
import {
  analizarRepo,
  analizarCategoria as analizarCategoriaIA,
  nombreProveedorActivo,
} from '../services/ai/index.js'
import { detectarIdioma } from '../utils/idiomaRepo.js'

// Labels que marcan issues "para empezar" (categoría good_first_issue).
const ETIQUETAS_GFI = ['good-first-issue', 'good first issue', 'help-wanted', 'up-for-grabs']

// Une los issues base con los filtrados por label, sin duplicar por número.
function unirIssues(base = [], extra = []) {
  const vistos = new Set(base.map((i) => i.numero))
  return [...base, ...extra.filter((i) => !vistos.has(i.numero))]
}

// Hook de análisis en DOS FASES:
//   Fase 1 (analizar): diagnóstico ligero de todas las categorías (sin bajar archivos).
//   Fase 2 (analizarCategoria): ataque enfocado a 1 categoría → la IA pide archivos,
//     se bajan, genera contenido completo, y se fusiona en analisis[clave].
// El contexto de Fase 1 se guarda en una ref para reusarlo en Fase 2 sin re-fetch.
export function useRepoAnalysis() {
  const [analisis, setAnalisis] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [proveedor, setProveedor] = useState(null)
  const [idiomaRepo, setIdiomaRepoState] = useState('en')
  const [estadosCategoria, setEstadosCategoria] = useState({}) // clave → { estado, error }

  const ultimoRepoRef = useRef(null)
  const contextoRef = useRef(null)
  const idiomaRepoRef = useRef('en')
  const idiomaManualRef = useRef(false) // true cuando el usuario lo fijó a mano

  const analizar = useCallback(async (repo, { idioma } = {}) => {
    if (!repo) return
    ultimoRepoRef.current = repo
    setCargando(true)
    setError(null)
    setAnalisis(null)
    setEstadosCategoria({})
    setProveedor(nombreProveedorActivo())
    try {
      const [readme, issuesBase, issuesGFI, arbol] = await Promise.all([
        getReadme(repo.owner, repo.repo),
        getIssuesAbiertos(repo.owner, repo.repo),
        getIssuesPorLabel(repo.owner, repo.repo, ETIQUETAS_GFI),
        getArbolRecursivo(repo.owner, repo.repo),
      ])
      const issues = unirIssues(issuesBase, issuesGFI)

      // Idioma: override explícito > elección manual previa > detección por README.
      let idiomaFinal = idioma
      if (!idiomaFinal) {
        idiomaFinal = idiomaManualRef.current
          ? idiomaRepoRef.current
          : detectarIdioma(readme)
      }
      idiomaRepoRef.current = idiomaFinal
      setIdiomaRepoState(idiomaFinal)

      const contexto = {
        meta: {
          nombre: repo.nombre,
          descripcion: repo.descripcion,
          lenguaje: repo.lenguaje,
          estrellas: repo.estrellas,
          velocidad: repo.velocidad,
          topics: repo.topics,
        },
        readme,
        idiomaRepo: idiomaFinal,
        issues,
        arbol,
        archivos: [],
        owner: repo.owner,
        repo: repo.repo,
      }
      contextoRef.current = contexto

      const resultado = await analizarRepo(contexto)
      setAnalisis(resultado)
    } catch (e) {
      setError(e.message || 'Falló el análisis con IA')
    } finally {
      setCargando(false)
    }
  }, [])

  // Fase 2: ataque enfocado a una categoría. Devuelve los datos generados (o lanza).
  // Fusiona el resultado en analisis[clave] y marca __profundo para no repetir.
  const analizarCategoria = useCallback(async (clave) => {
    const contexto = contextoRef.current
    if (!contexto) throw new Error('Primero hay que diagnosticar el repo')

    setEstadosCategoria((p) => ({ ...p, [clave]: { estado: 'cargando' } }))
    try {
      const datos = await analizarCategoriaIA(contexto, clave)
      const fusionado = { ...datos, __profundo: true }
      setAnalisis((prev) => ({ ...prev, [clave]: { ...(prev?.[clave] || {}), ...fusionado } }))
      setEstadosCategoria((p) => ({ ...p, [clave]: { estado: 'listo' } }))
      return fusionado
    } catch (e) {
      setEstadosCategoria((p) => ({
        ...p,
        [clave]: { estado: 'error', error: e.message },
      }))
      throw e
    }
  }, [])

  // Toggle manual de idioma: fija la preferencia y regenera el diagnóstico.
  const setIdiomaRepo = useCallback(
    (nuevo) => {
      idiomaManualRef.current = true
      idiomaRepoRef.current = nuevo
      setIdiomaRepoState(nuevo)
      if (ultimoRepoRef.current) {
        analizar(ultimoRepoRef.current, { idioma: nuevo })
      }
    },
    [analizar],
  )

  const reset = useCallback(() => {
    setAnalisis(null)
    setError(null)
    setEstadosCategoria({})
    ultimoRepoRef.current = null
    contextoRef.current = null
    idiomaManualRef.current = false
  }, [])

  return {
    analisis,
    cargando,
    error,
    proveedor,
    idiomaRepo,
    estadosCategoria,
    analizar,
    analizarCategoria,
    setIdiomaRepo,
    reset,
  }
}
