import { useState } from 'react'
import { CATEGORIAS_ACCION, getArchivoSugerido } from '../utils/categorias.js'

// Checkboxes de las 4 categorías accionables (selección múltiple 1-4).
// Cada card muestra: chip de categoría, barra de score, resumen y detalle expandible.
export default function CategorySelector({ analisis, seleccionadas, onToggle }) {
  if (!analisis) return null
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Marca de 1 a 4 categorías para actuar sobre ellas.
      </p>
      {CATEGORIAS_ACCION.map((cat) => (
        <CategoriaCard
          key={cat.clave}
          cat={cat}
          datos={analisis[cat.clave] || {}}
          seleccionada={seleccionadas.includes(cat.clave)}
          onToggle={() => onToggle?.(cat.clave)}
        />
      ))}
    </div>
  )
}

function CategoriaCard({ cat, datos, seleccionada, onToggle }) {
  const [abierta, setAbierta] = useState(false)
  const score = Number(datos.score) || 0

  return (
    <div
      className={
        'rounded-xl bg-slate-800/60 p-4 ring-1 transition ' +
        (seleccionada ? cat.anillo : 'ring-slate-700')
      }
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={seleccionada}
          onChange={onToggle}
          className="mt-1 h-4 w-4 shrink-0 accent-emerald-500"
          aria-label={`Seleccionar ${cat.label}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={'rounded-full px-2.5 py-0.5 text-xs font-semibold ' + cat.chip}
            >
              {cat.label}
            </span>
            <ScoreBar score={score} barra={cat.barra} />
          </div>
          {datos.resumen && (
            <p className="mt-2 text-sm text-slate-400">{datos.resumen}</p>
          )}
          <button
            type="button"
            onClick={() => setAbierta((v) => !v)}
            className="mt-2 text-xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
          >
            {abierta ? 'Ocultar detalle' : 'Ver detalle'}
          </button>
          {abierta && <Detalle cat={cat} datos={datos} />}
        </div>
      </div>
    </div>
  )
}

function Detalle({ cat, datos }) {
  const archivo = getArchivoSugerido(cat.clave, datos)
  return (
    <div className="mt-3 space-y-2 border-t border-slate-700 pt-3 text-sm">
      <p className="text-xs text-slate-500">
        Archivo objetivo: <code className="text-slate-300">{archivo}</code>
      </p>

      {cat.clave === 'features_faltantes' && (
        <>
          {datos.feature_principal && (
            <p className="text-slate-300">
              <span className="text-slate-500">Feature:</span>{' '}
              {datos.feature_principal}
            </p>
          )}
          <CodeBlock texto={datos.codigo_propuesto} />
        </>
      )}

      {cat.clave === 'docs_readme' && (
        <>
          {Array.isArray(datos.secciones_faltantes) &&
            datos.secciones_faltantes.length > 0 && (
              <p className="text-slate-300">
                <span className="text-slate-500">Faltan:</span>{' '}
                {datos.secciones_faltantes.join(', ')}
              </p>
            )}
          <CodeBlock texto={datos.contenido_propuesto} />
        </>
      )}

      {cat.clave === 'gap_mercado' && (
        <>
          {Array.isArray(datos.competidores) && datos.competidores.length > 0 && (
            <p className="text-slate-300">
              <span className="text-slate-500">Competidores:</span>{' '}
              {datos.competidores.join(', ')}
            </p>
          )}
          {datos.angulo_unico && (
            <p className="text-slate-300">
              <span className="text-slate-500">Ángulo único:</span>{' '}
              {datos.angulo_unico}
            </p>
          )}
          <CodeBlock texto={datos.propuesta} />
        </>
      )}

      {cat.clave === 'codigo_solid' && (
        <>
          {datos.principio_violado && (
            <p className="text-slate-300">
              <span className="text-slate-500">Principio violado:</span>{' '}
              {datos.principio_violado}
            </p>
          )}
          {datos.explicacion_cambios && (
            <p className="text-slate-400">{datos.explicacion_cambios}</p>
          )}
          <CodeBlock texto={datos.codigo_refactorizado} />
        </>
      )}
    </div>
  )
}

function CodeBlock({ texto }) {
  if (!texto) return null
  return (
    <pre className="max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-300 ring-1 ring-slate-800">
      <code>{texto}</code>
    </pre>
  )
}

function ScoreBar({ score, barra }) {
  const pct = Math.max(0, Math.min(10, score)) * 10
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-700">
        <div className={'h-full rounded-full ' + barra} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-300">{score}/10</span>
    </div>
  )
}
