// Pestañas para alternar entre los modos de búsqueda.
const MODOS = [
  { id: 'trending', label: 'Descubrir' },
  { id: 'usuario', label: 'Por autor' },
  { id: 'repo', label: 'Repo directo' },
]

export default function SelectorModo({ modo, onModo }) {
  return (
    <div className="inline-flex rounded-lg border border-white/[0.08] bg-[#0e0f11] p-1">
      {MODOS.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onModo(m.id)}
          className={
            'rounded-md px-3 py-1.5 text-sm font-medium transition ' +
            (modo === m.id
              ? 'bg-[#007ACC]/18 text-sky-100 ring-1 ring-[#007ACC]/50'
              : 'text-[#8a8f98] hover:text-[#e1e3e6]')
          }
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
