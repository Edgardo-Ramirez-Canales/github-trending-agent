// Chips multi-select de lenguajes (filtro de cliente).
export default function FiltroLenguajes({ disponibles, seleccionados, onToggle }) {
  return (
    <div className="md:col-span-2">
      <span className="text-xs font-medium text-[#8a8f98]">Lenguaje</span>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {disponibles.length === 0 && (
          <span className="text-xs text-[#62666d]">—</span>
        )}
        {disponibles.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => onToggle(l)}
            className={
              'rounded-md px-2.5 py-1 text-xs font-medium transition ' +
              (seleccionados.includes(l)
                ? 'bg-[#007ACC]/18 text-sky-100 ring-1 ring-[#007ACC]/50'
                : 'bg-white/[0.04] text-[#c4c7cc] ring-1 ring-white/[0.08] hover:bg-white/[0.07]')
            }
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  )
}
