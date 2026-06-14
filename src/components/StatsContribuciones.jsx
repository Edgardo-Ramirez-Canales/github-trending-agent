// Barra horizontal apilada (SVG puro, sin dependencias) con el desglose de
// contribuciones por estado, más la tasa de aceptación destacada.
// Cumple reglas de chart del skill: leyenda visible, color + texto (no solo
// color), estado vacío con mensaje, valores numéricos directos.

const SERIES = [
  { key: 'aceptado', label: 'Aceptados', color: '#34d399' }, // emerald-400
  { key: 'rechazado', label: 'Rechazados', color: '#f87171' }, // red-400
  { key: 'abierto', label: 'Abiertos', color: '#38bdf8' }, // sky-400
  { key: 'cancelado', label: 'Cancelados', color: '#71717a' }, // zinc-500
]

export default function StatsContribuciones({ stats }) {
  const { total, tasaAceptacion, cerrados } = stats
  const segmentos = SERIES.map((s) => ({ ...s, valor: stats[s.key] })).filter(
    (s) => s.valor > 0,
  )

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-[#e1e3e6]">Contribuciones</h3>
        <span className="text-xs text-[#62666d]">{total} en total</span>
      </div>

      {total === 0 ? (
        <div className="mt-3 rounded-md border border-dashed border-white/[0.08] bg-white/[0.02] px-3 py-4 text-center text-xs text-[#62666d]">
          Aún no hay contribuciones. Abre un issue (Modo B) o un PR (Modo C) y
          aparecerán aquí.
        </div>
      ) : (
        <>
          {/* Tasa de aceptación destacada */}
          <div className="mt-2 flex items-end gap-1.5">
            <span className="text-3xl font-bold leading-none text-emerald-400">
              {tasaAceptacion}%
            </span>
            <span className="pb-0.5 text-xs text-[#62666d]">
              tasa de aceptación
              {cerrados > 0 && ` · ${cerrados} cerrados`}
            </span>
          </div>

          {/* Barra apilada */}
          <svg
            viewBox="0 0 100 6"
            preserveAspectRatio="none"
            className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/[0.05]"
            role="img"
            aria-label={`Aceptados ${stats.aceptado}, rechazados ${stats.rechazado}, abiertos ${stats.abierto}, cancelados ${stats.cancelado}`}
          >
            {(() => {
              let x = 0
              return segmentos.map((s) => {
                const w = (s.valor / total) * 100
                const rect = (
                  <rect
                    key={s.key}
                    x={x}
                    y="0"
                    width={w}
                    height="6"
                    fill={s.color}
                  >
                    <title>{`${s.label}: ${s.valor}`}</title>
                  </rect>
                )
                x += w
                return rect
              })
            })()}
          </svg>

          {/* Leyenda con conteos */}
          <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
            {SERIES.map((s) => (
              <li
                key={s.key}
                className="flex items-center gap-1.5 text-xs text-[#8a8f98]"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="flex-1">{s.label}</span>
                <span className="font-semibold text-[#e1e3e6]">
                  {stats[s.key]}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
