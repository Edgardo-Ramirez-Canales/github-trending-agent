// Filtro de fecha de creación (servidor): presets rápidos + rango personalizado.
// `value` = { preset, desde, hasta }. `onChange` recibe un merge parcial.

const PRESETS = [
  { id: '', label: 'Cualquiera' },
  { id: 'semana', label: 'Última semana' },
  { id: 'mesActual', label: 'Mes actual' },
  { id: '3meses', label: '3 meses' },
  { id: '6meses', label: '6 meses' },
  { id: '9meses', label: '9 meses' },
  { id: 'anioActual', label: 'Año actual' },
  { id: 'ultimoAnio', label: 'Último año' },
  { id: 'personalizado', label: 'Personalizado' },
]

export default function FiltroFechas({ value, onChange }) {
  const { preset, desde, hasta } = value

  return (
    <div className="md:col-span-2">
      <span className="text-xs font-medium text-[#8a8f98]">Creados en</span>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.id || 'cualquiera'}
            type="button"
            onClick={() => onChange({ preset: p.id, desde: '', hasta: '' })}
            className={
              'rounded-md px-2.5 py-1 text-xs font-medium transition ' +
              (preset === p.id
                ? 'bg-[#007ACC]/18 text-sky-100 ring-1 ring-[#007ACC]/50'
                : 'bg-white/[0.04] text-[#c4c7cc] ring-1 ring-white/[0.08] hover:bg-white/[0.07]')
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === 'personalizado' && (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-xs text-[#8a8f98]">
            Desde
            <input
              type="date"
              value={desde || ''}
              onChange={(e) => onChange({ desde: e.target.value })}
              className="mt-1 block rounded-md border border-white/[0.08] bg-[#0a0b0d] px-2 py-1.5 text-sm text-[#f7f8f8] outline-none transition focus:border-[#007ACC]/70 focus:ring-2 focus:ring-[#007ACC]/25"
            />
          </label>
          <label className="text-xs text-[#8a8f98]">
            Hasta
            <input
              type="date"
              value={hasta || ''}
              onChange={(e) => onChange({ hasta: e.target.value })}
              className="mt-1 block rounded-md border border-white/[0.08] bg-[#0a0b0d] px-2 py-1.5 text-sm text-[#f7f8f8] outline-none transition focus:border-[#007ACC]/70 focus:ring-2 focus:ring-[#007ACC]/25"
            />
          </label>
        </div>
      )}
    </div>
  )
}
