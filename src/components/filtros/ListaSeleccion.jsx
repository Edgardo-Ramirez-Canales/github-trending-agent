import { LABEL } from './estilos.js'
import { IconCheck } from '../icons.jsx'

// Lista vertical de selección ÚNICA. El indicador puede ser:
//   tipo='radio' → círculo con punto (semántica de "elegí uno").
//   tipo='check' → cuadrado con tilde (look de casilla, pero exclusivo: marcar
//                  una desmarca las demás).
//   opciones: [{ value, label }]
export default function ListaSeleccion({ etiqueta, value, onChange, opciones, tipo = 'radio' }) {
  const redondo = tipo === 'radio'
  return (
    <div>
      <span className={LABEL}>{etiqueta}</span>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
        {opciones.map((o) => {
          const activo = value === o.value
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className="group flex items-center gap-2.5 text-left text-sm text-[#c4c7cc] transition hover:text-[#f7f8f8]"
            >
              <span
                className={
                  'flex h-4 w-4 shrink-0 items-center justify-center border transition ' +
                  (redondo ? 'rounded-full ' : 'rounded ') +
                  (activo
                    ? 'border-[#007ACC] bg-[#007ACC]/20'
                    : 'border-white/20 group-hover:border-white/40')
                }
              >
                {activo &&
                  (redondo ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#3b9eff]" />
                  ) : (
                    <IconCheck className="h-3 w-3 text-[#3b9eff]" />
                  ))}
              </span>
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
