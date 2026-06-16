import FiltroEstrellas from './FiltroEstrellas.jsx'
import FiltroLenguajes from './FiltroLenguajes.jsx'
import FiltroFechas from './FiltroFechas.jsx'
import ToggleVistos from './ToggleVistos.jsx'

// Contenedor de los controles de filtro del modo Trending.
// Estado y lógica viven en useFiltros (en el padre); aquí solo se renderiza.
export default function BarraFiltros({
  filtros,
  setFiltro,
  setFecha,
  toggleLenguaje,
  lenguajesDisponibles,
  sugerirVistos,
}) {
  return (
    <div className="mt-4 grid gap-4 rounded-lg border border-white/[0.08] bg-[#0e0f11] p-4 shadow-2xl shadow-black/20 md:grid-cols-2">
      <FiltroFechas value={filtros.fecha} onChange={setFecha} />

      <FiltroEstrellas
        value={filtros.minEstrellas}
        onChange={(v) => setFiltro('minEstrellas', v)}
      />

      <div>
        <label htmlFor="velmin" className="text-xs font-medium text-[#8a8f98]">
          Velocidad mínima: {filtros.velocidadMin} ★/día
        </label>
        <input
          id="velmin"
          type="range"
          min="0"
          max="500"
          step="5"
          value={filtros.velocidadMin}
          onChange={(e) => setFiltro('velocidadMin', Number(e.target.value))}
          className="mt-2 w-full ctrl-range"
        />
      </div>

      <div>
        <label htmlFor="kw" className="text-xs font-medium text-[#8a8f98]">
          Keyword / tópico
        </label>
        <input
          id="kw"
          type="text"
          value={filtros.keyword}
          onChange={(e) => setFiltro('keyword', e.target.value)}
          placeholder="ej: cli, ai, rust…"
          className="mt-1 w-full rounded-md border border-white/[0.08] bg-[#0a0b0d] px-3 py-2 text-sm text-[#f7f8f8] placeholder:text-[#4a4d54] outline-none transition focus:border-[#007ACC]/70 focus:ring-2 focus:ring-[#007ACC]/25"
        />
      </div>

      <FiltroLenguajes
        disponibles={lenguajesDisponibles}
        seleccionados={filtros.lenguajes}
        onToggle={toggleLenguaje}
      />

      <ToggleVistos
        checked={filtros.incluirVistos}
        onChange={(v) => setFiltro('incluirVistos', v)}
        sugerir={sugerirVistos}
      />

      <div>
        <label htmlFor="orden" className="text-xs font-medium text-[#8a8f98]">
          Ordenar por
        </label>
        <select
          id="orden"
          value={filtros.orden}
          onChange={(e) => setFiltro('orden', e.target.value)}
          className="mt-1 w-full rounded-md border border-white/[0.08] bg-[#0a0b0d] px-3 py-2 text-sm text-[#f7f8f8] outline-none transition focus:border-[#007ACC]/70 focus:ring-2 focus:ring-[#007ACC]/25"
        >
          <option value="velocidad">Velocidad de crecimiento</option>
          <option value="estrellas">Total de estrellas</option>
          <option value="fecha">Fecha de creación</option>
        </select>
      </div>
    </div>
  )
}
