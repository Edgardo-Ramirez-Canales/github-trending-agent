import { useEffect, useState, useCallback } from 'react'
import { useRepoAnalysis } from '../hooks/useRepoAnalysis.js'
import { META_POR_CLAVE, getArchivoSugerido } from '../utils/categorias.js'
import {
  generarDiagramaHTML,
  generarSkillMD,
  generarOnboardingMD,
  descargar,
} from '../utils/artefactos.js'
import AnalysisPanel from './AnalysisPanel.jsx'
import ModeSelector from './ModeSelector.jsx'
import ModeRunner from './ModeRunner.jsx'

// Genera y descarga el artefacto local de una categoría (destino: 'artefacto').
function descargarArtefacto(clave, datos) {
  const meta = META_POR_CLAVE[clave]
  let contenido = ''
  if (clave === 'diagrama_arquitectura') {
    contenido = generarDiagramaHTML(datos.nodos, datos.aristas, datos.resumen_funcional)
  } else if (clave === 'skill_plantilla') {
    contenido = generarSkillMD(datos)
  } else if (clave === 'onboarding') {
    contenido = generarOnboardingMD(datos)
  }
  if (!contenido) return
  descargar(getArchivoSugerido(clave, datos), contenido, meta?.artefacto?.mime)
}

// Panel de detalle de un repo: dispara el análisis con la IA configurada y
// gestiona la selección de categorías. Enruta cada categoría según su destino:
// 'pr' → fork→PR vía ModeRunner; 'artefacto' → descarga local; 'lectura' → nada.
export default function RepoDetail({ repo, onClose, onContribCreada }) {
  const {
    analisis,
    cargando,
    error,
    proveedor,
    analizar,
    modo: modoAnalisis,
    idiomaRepo,
    setIdiomaRepo,
  } = useRepoAnalysis()
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

  // Acción principal de una categoría según su destino.
  const atacar = useCallback(
    (clave) => {
      const destino = META_POR_CLAVE[clave]?.destino
      if (destino === 'artefacto') {
        descargarArtefacto(clave, analisis?.[clave] || {})
        return
      }
      // destino 'pr': se suma a la selección para ejecutarse vía ModeRunner.
      setSeleccionadas((prev) => (prev.includes(clave) ? prev : [...prev, clave]))
    },
    [analisis],
  )

  // Solo las categorías PR llegan a ModeRunner (los artefactos se descargan aparte).
  const seleccionadasPR = seleccionadas.filter(
    (c) => META_POR_CLAVE[c]?.destino === 'pr',
  )

  if (!repo) return null

  return (
    <div className="mt-6 rounded-lg border border-white/[0.08] bg-[#0e0f11] p-5 shadow-2xl shadow-black/25">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <a
            href={repo.url}
            target="_blank"
            rel="noreferrer"
            className="truncate text-lg font-semibold text-[#f7f8f8] hover:text-white hover:underline"
          >
            {repo.nombre}
          </a>
          {repo.descripcion && (
            <p className="mt-1 text-sm leading-6 text-[#8a8f98]">{repo.descripcion}</p>
          )}
          <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-[#62666d]">
            <span>★ {repo.estrellas.toLocaleString('es')}</span>
            <span className="text-[#7cc7ff]">↑ {repo.velocidad}/día</span>
            {repo.lenguaje !== 'N/D' && <span>{repo.lenguaje}</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-sm text-[#8a8f98] transition hover:bg-white/[0.06] hover:text-[#e1e3e6]"
        >
          Cerrar
        </button>
      </div>

      <div className="mt-4 border-t border-white/[0.08] pt-4">
        {/* Estado: analizando */}
        {cargando && (
          <div className="flex items-center gap-3 py-6 text-[#c4c7cc]">
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
              <p className="mb-3 text-xs text-[#62666d]">
                Análisis generado con{' '}
                <span className="text-[#c4c7cc]">{proveedor}</span>
              </p>
            )}
            <AnalysisPanel
              analisis={analisis}
              seleccionadas={seleccionadas}
              onToggle={toggle}
              onAtacar={atacar}
              idiomaRepo={idiomaRepo}
              onCambiarIdioma={setIdiomaRepo}
              onAnalisisProfundo={() => analizar(repo, { modo: 'B' })}
              modo={modoAnalisis}
              cargando={cargando}
            />

            {/* Selección de modo + ejecución (solo categorías PR) */}
            {seleccionadasPR.length === 0 ? (
              <div className="mt-5 rounded-lg border border-dashed border-white/[0.1] bg-white/[0.02] p-4 text-center text-sm text-[#62666d]">
                Selecciona una categoría PR para elegir un modo de acción, o usa
                «Generar y descargar» en los artefactos.
              </div>
            ) : (
              <div className="mt-6 border-t border-white/[0.08] pt-5">
                <ModeSelector modo={modo} onChange={setModo} />
                <ModeRunner
                  repo={repo}
                  analisis={analisis}
                  seleccionadas={seleccionadasPR}
                  modo={modo}
                  onContribCreada={onContribCreada}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
