import CategorySelector from './CategorySelector.jsx'

// Resultado del análisis de la IA: bloque de Score de oportunidad (solo lectura)
// + los checkboxes de categorías (delegados a CategorySelector).
export default function AnalysisPanel({
  analisis,
  seleccionadas,
  onToggle,
  onAtacar,
}) {
  if (!analisis) return null

  const score = analisis.score_oportunidad || {}

  return (
    <div className="space-y-4">
      {/* Score de oportunidad (solo lectura) */}
      <div className="rounded-xl bg-slate-800/60 p-4 ring-1 ring-slate-700">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-200">
            Score de oportunidad
          </h3>
          <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs font-semibold text-indigo-300">
            Global {score.puntaje_global ?? '—'}/10
          </span>
        </div>
        {score.justificacion && (
          <p className="mt-2 text-sm text-slate-400">{score.justificacion}</p>
        )}
        {score.categoria_recomendada && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-400">
              Recomendado primero:{' '}
              <strong className="text-slate-200">
                {etiqueta(score.categoria_recomendada)}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => onAtacar?.(score.categoria_recomendada)}
              className="rounded-lg bg-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-200 ring-1 ring-indigo-500/40 hover:bg-indigo-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              Atacar esta oportunidad
            </button>
          </div>
        )}
        {Array.isArray(score.orden_sugerido) && score.orden_sugerido.length > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            Orden sugerido: {score.orden_sugerido.map(etiqueta).join(' → ')}
          </p>
        )}
      </div>

      {/* Checkboxes de categorías */}
      <CategorySelector
        analisis={analisis}
        seleccionadas={seleccionadas}
        onToggle={onToggle}
      />
    </div>
  )
}

function etiqueta(clave) {
  const map = {
    features_faltantes: 'Features',
    docs_readme: 'Docs',
    gap_mercado: 'Mercado',
    codigo_solid: 'Código',
  }
  return map[clave] || clave
}
