import { LABEL, pill } from './estilos.js'

// Filtro de fecha de creación (servidor): presets rápidos + rango personalizado.
// `value` = { preset, desde, hasta }. `onChange` recibe un merge parcial.
// "Todas" (preset '') es el estado neutro por defecto al cargar el sitio.

const PRESETS = [
  { id: '', label: 'Todas' },
  { id: 'semana', label: 'Última semana' },
  { id: 'mesActual', label: 'Mes actual' },
  { id: 'personalizado', label: 'Personalizado' },
]

const FECHA_INPUT =
  'rounded-md border border-white/[0.08] bg-[#0a0b0d] px-2.5 py-1.5 text-sm text-[#f7f8f8] outline-none transition focus:border-[#007ACC]/70 focus:ring-2 focus:ring-[#007ACC]/25 [color-scheme:dark]'

export default function FiltroFechas({ value, onChange }) {
  const { preset, desde, hasta } = value

  return (
    <div>
      <span className={LABEL}>Creados en</span>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.id || 'todas'}
            type="button"
            onClick={() => onChange({ preset: p.id, desde: '', hasta: '' })}
            className={pill(preset === p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === 'personalizado' && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
          <span className={LABEL}>Desde</span>
          <input
            type="date"
            aria-label="Fecha desde"
            value={desde || ''}
            onChange={(e) => onChange({ desde: e.target.value })}
            className={FECHA_INPUT}
          />
          <span className="text-[#62666d]">→</span>
          <span className={LABEL}>Hasta</span>
          <input
            type="date"
            aria-label="Fecha hasta"
            value={hasta || ''}
            onChange={(e) => onChange({ hasta: e.target.value })}
            className={FECHA_INPUT}
          />
        </div>
      )}
    </div>
  )
}
