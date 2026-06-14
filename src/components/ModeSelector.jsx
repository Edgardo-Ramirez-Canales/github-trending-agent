// Selector de modo global de acción. Aplica a todas las categorías seleccionadas.
const MODOS = [
  {
    id: 'A',
    titulo: 'Modo A — Solo texto',
    desc: 'Genera el borrador completo. No toca GitHub. Tú actúas manualmente.',
    chip: 'bg-slate-500/15 text-slate-300',
    anillo: 'ring-slate-400/50',
  },
  {
    id: 'B',
    titulo: 'Modo B — Propuesta al dueño',
    desc: 'Abre un issue real en el repo original con el análisis. Requiere tu aprobación.',
    chip: 'bg-[#007ACC]/15 text-[#7cc7ff]',
    anillo: 'ring-[#007ACC]/55',
  },
  {
    id: 'C',
    titulo: 'Modo C — Agente completo',
    desc: 'Fork → rama → commit → PR, con diff y aprobación por categoría. El más potente.',
    chip: 'bg-emerald-500/15 text-emerald-300',
    anillo: 'ring-emerald-400/50',
  },
]

export default function ModeSelector({ modo, onChange, disabled }) {
  return (
    <fieldset disabled={disabled} className="disabled:opacity-50">
      <legend className="text-sm font-semibold text-slate-200">
        Modo de acción
      </legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {MODOS.map((m) => {
          const activo = modo === m.id
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange?.(m.id)}
              className={
                'flex flex-col gap-1.5 rounded-lg bg-[#101722]/78 p-4 text-left ring-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007ACC] ' +
                (activo
                  ? m.anillo + ' bg-[#111a27]'
                  : 'ring-slate-700 hover:ring-slate-600')
              }
            >
              <span
                className={'w-fit rounded-full px-2 py-0.5 text-xs font-bold ' + m.chip}
              >
                {m.id}
              </span>
              <span className="text-sm font-semibold text-slate-100">
                {m.titulo}
              </span>
              <span className="text-xs text-slate-400">{m.desc}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
