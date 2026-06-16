import { LABEL } from './estilos.js'

// Slider de rango de estrellas (filtro de cliente): mínimo y máximo en un mismo
// riel con dos manijas. `max === null` significa "sin tope": cuando la manija
// superior llega al final del riel se interpreta como infinito y se setea null.
const MIN = 0
const MAX = 20000
const STEP = 100

export default function FiltroRangoEstrellas({ min, max, onMin, onMax }) {
  const maxEfectivo = max == null ? MAX : max
  const sinTope = max == null

  // Mantiene las manijas separadas al menos un step.
  function cambiarMin(v) {
    onMin(Math.min(v, maxEfectivo - STEP))
  }
  function cambiarMax(v) {
    // Llegar al final = sin tope (null); si no, no bajar por debajo del mínimo.
    if (v >= MAX) onMax(null)
    else onMax(Math.max(v, min + STEP))
  }

  const pctMin = (min / MAX) * 100
  const pctMax = (maxEfectivo / MAX) * 100

  return (
    <div>
      <label className={LABEL}>
        Estrellas: {min.toLocaleString('es')} –{' '}
        {sinTope ? '20.000+' : max.toLocaleString('es')}
      </label>

      <div className="range-dual mt-3">
        <div className="riel" />
        <div className="relleno" style={{ left: `${pctMin}%`, right: `${100 - pctMax}%` }} />
        <input
          type="range"
          aria-label="Estrellas mínimas"
          min={MIN}
          max={MAX}
          step={STEP}
          value={min}
          onChange={(e) => cambiarMin(Number(e.target.value))}
          className="ctrl-range"
        />
        <input
          type="range"
          aria-label="Estrellas máximas"
          min={MIN}
          max={MAX}
          step={STEP}
          value={maxEfectivo}
          onChange={(e) => cambiarMax(Number(e.target.value))}
          className="ctrl-range"
        />
      </div>
    </div>
  )
}
