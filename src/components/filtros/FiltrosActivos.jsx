// Chips de los filtros activos (no-default), cada uno removible, + "Limpiar".
// Solo lectura del estado: las acciones delegan en los setters del padre.

const ETIQUETAS_FECHA = {
  semana: 'Última semana',
  mesActual: 'Mes actual',
  '3meses': '3 meses',
  '6meses': '6 meses',
  '9meses': '9 meses',
  anioActual: 'Año actual',
  ultimoAnio: 'Último año',
  personalizado: 'Fecha a medida',
}

function Chip({ children, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-[#007ACC]/12 px-2 py-1 text-xs font-medium text-sky-100 ring-1 ring-[#007ACC]/40">
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Quitar filtro"
        className="text-sky-200/70 transition hover:text-white"
      >
        ✕
      </button>
    </span>
  )
}

export default function FiltrosActivos({ filtros, setFiltro, setFecha, toggleLenguaje, limpiar }) {
  const chips = []

  if (filtros.fecha.preset) {
    chips.push(
      <Chip key="fecha" onRemove={() => setFecha({ preset: '', desde: '', hasta: '' })}>
        {ETIQUETAS_FECHA[filtros.fecha.preset] || 'Fecha'}
      </Chip>,
    )
  }
  if (filtros.minEstrellas !== 100) {
    chips.push(
      <Chip key="min" onRemove={() => setFiltro('minEstrellas', 100)}>
        ★ ≥ {filtros.minEstrellas.toLocaleString('es')}
      </Chip>,
    )
  }
  if (filtros.maxEstrellas != null) {
    chips.push(
      <Chip key="max" onRemove={() => setFiltro('maxEstrellas', null)}>
        ★ ≤ {filtros.maxEstrellas.toLocaleString('es')}
      </Chip>,
    )
  }
  if (filtros.velocidadMin > 0) {
    chips.push(
      <Chip key="vel" onRemove={() => setFiltro('velocidadMin', 0)}>
        {filtros.velocidadMin} ★/día
      </Chip>,
    )
  }
  if (filtros.soloOriginales) {
    chips.push(
      <Chip key="orig" onRemove={() => setFiltro('soloOriginales', false)}>
        Solo originales
      </Chip>,
    )
  }
  if (filtros.incluirVistos) {
    chips.push(
      <Chip key="vistos" onRemove={() => setFiltro('incluirVistos', false)}>
        Incluye vistos
      </Chip>,
    )
  }
  if (filtros.pushedDesde) {
    chips.push(
      <Chip key="pushed" onRemove={() => setFiltro('pushedDesde', '')}>
        Activo desde {filtros.pushedDesde}
      </Chip>,
    )
  }
  if (filtros.keyword.trim()) {
    chips.push(
      <Chip key="kw" onRemove={() => setFiltro('keyword', '')}>
        “{filtros.keyword.trim()}”
      </Chip>,
    )
  }
  for (const l of filtros.lenguajes) {
    chips.push(
      <Chip key={`lang-${l}`} onRemove={() => toggleLenguaje(l)}>
        {l}
      </Chip>,
    )
  }

  if (chips.length === 0) return null

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      {chips}
      <button
        type="button"
        onClick={limpiar}
        className="rounded-md px-2 py-1 text-xs font-medium text-[#8a8f98] underline-offset-2 transition hover:text-[#e1e3e6] hover:underline"
      >
        Limpiar
      </button>
    </div>
  )
}
