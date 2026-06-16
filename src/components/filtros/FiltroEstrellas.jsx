// Slider de estrellas mínimas (filtro de cliente).
export default function FiltroEstrellas({ value, onChange }) {
  return (
    <div>
      <label className="text-xs font-medium text-[#8a8f98]">
        Estrellas mínimas: {value.toLocaleString('es')}
      </label>
      <input
        type="range"
        min="0"
        max="20000"
        step="100"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full ctrl-range"
      />
    </div>
  )
}
