import { useCallback, useRef, useState } from 'react'
import {
  getReadme,
  getIssuesAbiertos,
  getIssuesPorLabel,
  getArbolRecursivo,
  getContenidoArchivos,
} from '../services/github.js'
import { analizarRepo, nombreProveedorActivo } from '../services/ai/index.js'
import { detectarIdioma } from '../utils/idiomaRepo.js'
import { elegirArchivos } from '../utils/selectorArchivos.js'

// Labels que marcan issues "para empezar" (categoría good_first_issue).
const ETIQUETAS_GFI = ['good-first-issue', 'good first issue', 'help-wanted', 'up-for-grabs']

// Une los issues base con los filtrados por label, sin duplicar por número.
function unirIssues(base = [], extra = []) {
  const vistos = new Set(base.map((i) => i.numero))
  return [...base, ...extra.filter((i) => !vistos.has(i.numero))]
}

// Hook de análisis: reúne el contexto del repo desde GitHub (README, issues,
// árbol recursivo y archivos clave) y lo manda al proveedor de IA activo.
// Soporta modo A (1 pasada, default) y modo B (2 pasadas, "Análisis profundo"),
// más un toggle manual de idioma que regenera el análisis.
export function useRepoAnalysis() {
  const [analisis, setAnalisis] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [proveedor, setProveedor] = useState(null)
  const [modo, setModo] = useState('A')
  const [idiomaRepo, setIdiomaRepoState] = useState('en')

  const ultimoRepoRef = useRef(null)
  const modoRef = useRef('A')
  const idiomaRepoRef = useRef('en')
  const idiomaManualRef = useRef(false) // true cuando el usuario lo fijó a mano

  const analizar = useCallback(async (repo, { modo: modoArg = 'A', idioma } = {}) => {
    if (!repo) return
    ultimoRepoRef.current = repo
    modoRef.current = modoArg
    setModo(modoArg)
    setCargando(true)
    setError(null)
    setAnalisis(null)
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

      // Modo A baja los archivos aquí; modo B los pide la IA en la pasada 1.
      let archivos = []
      if (modoArg !== 'B') {
        const paths = elegirArchivos(arbol, readme, issues)
        archivos = await getContenidoArchivos(repo.owner, repo.repo, paths)
      }

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
        archivos,
        owner: repo.owner,
        repo: repo.repo,
      }

      const resultado = await analizarRepo(contexto, { modo: modoArg })
      setAnalisis(resultado)
    } catch (e) {
      setError(e.message || 'Falló el análisis con IA')
    } finally {
      setCargando(false)
    }
  }, [])

  // Toggle manual de idioma: fija la preferencia y regenera el análisis del
  // último repo con el mismo modo.
  const setIdiomaRepo = useCallback(
    (nuevo) => {
      idiomaManualRef.current = true
      idiomaRepoRef.current = nuevo
      setIdiomaRepoState(nuevo)
      if (ultimoRepoRef.current) {
        analizar(ultimoRepoRef.current, { modo: modoRef.current, idioma: nuevo })
      }
    },
    [analizar],
  )

  const reset = useCallback(() => {
    setAnalisis(null)
    setError(null)
    ultimoRepoRef.current = null
    idiomaManualRef.current = false
  }, [])

  return {
    analisis,
    cargando,
    error,
    proveedor,
    modo,
    idiomaRepo,
    analizar,
    setIdiomaRepo,
    reset,
  }
}
