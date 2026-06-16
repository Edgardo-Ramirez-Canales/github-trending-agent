import FiltroRangoEstrellas from './FiltroRangoEstrellas.jsx'
import FiltroLenguajes from './FiltroLenguajes.jsx'
import FiltroFechas from './FiltroFechas.jsx'
import FiltroActividad from './FiltroActividad.jsx'
import ToggleVistos from './ToggleVistos.jsx'
import ListaSeleccion from './ListaSeleccion.jsx'
import { OPCIONES_ORDEN } from './Segmentado.jsx'
import { LABEL, INPUT } from './estilos.js'
import { IconSearch } from '../icons.jsx'

// Contenedor de los controles de filtro del modo Trending.
// Estado y lógica viven en useFiltros (en el padre); aquí solo se renderiza.
//
// Orden visual (lo más importante arriba):
//   búsqueda en GitHub (ancho)
//   Creados en (izq) · Incluir vistos (esquina sup. derecha)
//   Actualizado (check exclusivo) · Ordenar por (radio)
//   Estrellas (rango) · Velocidad mínima
//   Lenguaje (ancho)
export default function BarraFiltros({
  filtros,
  setFiltro,
  setFecha,
  toggleLenguaje,
  lenguajesDisponibles,
  sugerirVistos,
}) {
  return (
    <div className="mt-4 rounded-lg border border-white/[0.08] bg-[#0e0f11] p-4 shadow-2xl shadow-black/20">
      {/* Búsqueda real en GitHub: acción principal, arriba y a todo el ancho */}
      <div>
        <label htmlFor="kw" className={LABEL}>
          Buscar en GitHub
        </label>
        <div className="relative mt-1">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#62666d]" />
          <input
            id="kw"
            type="text"
            value={filtros.keyword}
            onChange={(e) => setFiltro('keyword', e.target.value)}
            placeholder="Nombre, tópico o palabra clave… (ej: cli, ai, rust)"
            className={'pl-9 ' + INPUT}
          />
        </div>
        <p className="mt-1 text-[11px] text-[#62666d]">
          Consulta GitHub por nombre, descripción y README — no solo la lista actual.
        </p>
      </div>

      {/* Fechas a la izquierda, "incluir vistos" anclado arriba a la derecha */}
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <FiltroFechas value={filtros.fecha} onChange={setFecha} />
        <ToggleVistos
          checked={filtros.incluirVistos}
          onChange={(v) => setFiltro('incluirVistos', v)}
          sugerir={sugerirVistos}
        />
      </div>

      <div className="mt-5 grid gap-x-6 gap-y-5 md:grid-cols-2">
        <FiltroActividad
          value={filtros.pushedDesde}
          onChange={(v) => setFiltro('pushedDesde', v)}
        />

        <ListaSeleccion
          etiqueta="Ordenar por"
          tipo="radio"
          value={filtros.orden}
          onChange={(v) => setFiltro('orden', v)}
          opciones={OPCIONES_ORDEN}
        />

        <FiltroRangoEstrellas
          min={filtros.minEstrellas}
          max={filtros.maxEstrellas}
          onMin={(v) => setFiltro('minEstrellas', v)}
          onMax={(v) => setFiltro('maxEstrellas', v)}
        />

        <div>
          <label htmlFor="velmin" className={LABEL}>
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
            className="mt-3 w-full ctrl-range"
          />
        </div>

        <FiltroLenguajes
          disponibles={lenguajesDisponibles}
          seleccionados={filtros.lenguajes}
          onToggle={toggleLenguaje}
          className="md:col-span-2"
        />
      </div>
    </div>
  )
}
