import ListaSeleccion from './ListaSeleccion.jsx'

// Filtro "actualizado recientemente" (servidor → pushed:>=YYYY-MM-DD).
// Descarta repos abandonados. `value` es 'YYYY-MM-DD' o '' (sin filtro).
// Selección única presentada como casillas exclusivas (look de check).

function haceDias(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

// Cada opción se identifica por su nº de días en string ('0' = sin filtro).
const OPCIONES = [
  { value: '0', label: 'Sin filtro' },
  { value: '7', label: 'Última semana' },
  { value: '30', label: 'Último mes' },
]

export default function FiltroActividad({ value, onChange }) {
  // Deducir la opción activa a partir de la fecha guardada.
  const activa = !value
    ? '0'
    : OPCIONES.find((o) => o.value !== '0' && haceDias(Number(o.value)) === value)?.value ?? '0'

  function elegir(v) {
    const dias = Number(v)
    onChange(dias === 0 ? '' : haceDias(dias))
  }

  return (
    <ListaSeleccion
      etiqueta="Actualizado"
      tipo="check"
      value={activa}
      onChange={elegir}
      opciones={OPCIONES}
    />
  )
}
