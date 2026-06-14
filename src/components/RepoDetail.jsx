import { useEffect, useState, useCallback } from 'react'
import { useRepoAnalysis } from '../hooks/useRepoAnalysis.js'
import AnalysisPanel from './AnalysisPanel.jsx'
import ModeSelector from './ModeSelector.jsx'
import ModeRunner from './ModeRunner.jsx'

// Panel de detalle de un repo: dispara el análisis con la IA configurada y
// gestiona la selección de categorías (1-4). El selector de modo y la ejecución
// llegan en el siguiente bloque.
export default function RepoDetail({ repo, onClose }) {
  const { analisis, cargando, error, proveedor, analizar } = useRepoAnalysis()
  const [seleccionadas, setSeleccionadas] = useState([])
  const [modo, setModo] = useState(null)

  // Analiza automáticamente al abrir / cambiar de repo.
  useEffect(() => {
    if (repo) {
      setSeleccionadas([])
      setModo(null)
      analizar(repo)
    }
  }, [repo, analizar])

  const toggle = useCallback((clave) => {
    setSeleccionadas((prev) =>
      prev.includes(clave) ? prev.filter((c) => c !== clave) : [...prev, clave],
    )
  }, [])

  const atacar = useCallback((clave) => {
    setSeleccionadas((prev) => (prev.includes(clave) ? prev : [...prev, clave]))
  }, [])

  if (!repo) return null

  return (
    <div className="mt-6 rounded-lg border border-white/10 bg-[#0d111a]/86 p-5 shadow-2xl shadow-black/25">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <a
            href={repo.url}
            target="_blank"
            rel="noreferrer"
            className="truncate text-lg font-semibold text-slate-50 hover:text-white hover:underline"
          >
            {repo.nombre}
          </a>
          {repo.descripcion && (
            <p className="mt-1 text-sm leading-6 text-slate-400">{repo.descripcion}</p>
          )}
          <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-slate-500">
            <span>★ {repo.estrellas.toLocaleString('es')}</span>
            <span className="text-[#7cc7ff]">↑ {repo.velocidad}/día</span>
            {repo.lenguaje !== 'N/D' && <span>{repo.lenguaje}</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-sm text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-200"
        >
          Cerrar
        </button>
      </div>

      <div className="mt-4 border-t border-white/10 pt-4">
        {/* Estado: analizando */}
        {cargando && (
          <div className="flex items-center gap-3 py-6 text-slate-300">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-[#007ACC]" />
            Analizando con {proveedor || 'IA'}…
          </div>
        )}

        {/* Estado: error */}
        {error && !cargando && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => analizar(repo)}
              className="mt-2 rounded-md bg-red-500/20 px-3 py-1 text-xs font-medium text-red-200 hover:bg-red-500/30"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Resultado */}
        {analisis && !cargando && (
          <>
            {proveedor && (
              <p className="mb-3 text-xs text-slate-500">
                Análisis generado con{' '}
                <span className="text-slate-300">{proveedor}</span>
              </p>
            )}
            <AnalysisPanel
              analisis={analisis}
              seleccionadas={seleccionadas}
              onToggle={toggle}
              onAtacar={atacar}
            />

            {/* Selección de modo + ejecución */}
            {seleccionadas.length === 0 ? (
              <div className="mt-5 rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-4 text-center text-sm text-slate-500">
                Selecciona al menos una categoría para elegir un modo de acción.
              </div>
            ) : (
              <div className="mt-6 border-t border-white/10 pt-5">
                <ModeSelector modo={modo} onChange={setModo} />
                <ModeRunner
                  repo={repo}
                  analisis={analisis}
                  seleccionadas={seleccionadas}
                  modo={modo}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
