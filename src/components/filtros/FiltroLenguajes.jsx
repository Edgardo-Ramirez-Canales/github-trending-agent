import { LABEL, pill } from './estilos.js'

// Chips multi-select de lenguajes (filtro de cliente).
export default function FiltroLenguajes({ disponibles, seleccionados, onToggle, className = '' }) {
  return (
    <div className={className}>
      <span className={LABEL}>Lenguaje</span>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {disponibles.length === 0 && (
          <span className="text-xs text-[#62666d]">—</span>
        )}
        {disponibles.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => onToggle(l)}
            className={pill(seleccionados.includes(l))}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  )
}
