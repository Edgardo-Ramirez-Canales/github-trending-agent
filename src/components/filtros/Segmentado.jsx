import { LABEL, pill } from './estilos.js'

// Control segmentado de pills (una sola selección). Reemplaza a los <select>
// para mantener todo el panel con la misma estética de botones.
//   opciones: [{ value, label }]
export default function Segmentado({ etiqueta, value, onChange, opciones }) {
  return (
    <div>
      <span className={LABEL}>{etiqueta}</span>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {opciones.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={pill(value === o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// Opciones de orden compartidas (mismo set en trending y usuario).
export const OPCIONES_ORDEN = [
  { value: 'velocidad', label: 'Velocidad' },
  { value: 'estrellas', label: 'Estrellas' },
  { value: 'fecha', label: 'Fecha' },
]
