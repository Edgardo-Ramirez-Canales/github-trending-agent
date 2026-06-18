import { useState } from 'react'
import FiltroLenguajes from './FiltroLenguajes.jsx'
import { OPCIONES_ORDEN, OPCIONES_DIRECCION } from './Segmentado.jsx'
import { LABEL, INPUT } from './estilos.js'

// Panel del modo "Por usuario". El input de usuario es un filtro de SERVIDOR,
// así que NO se ata en cada tecla: se confirma con Enter o el botón "Buscar"
// para evitar un re-fetch por carácter (debounce real llega en Fase 8).
export default function BuscadorUsuario({
  filtros,
  setFiltro,
  toggleLenguaje,
  lenguajesDisponibles,
  usuarioActivo,
  totalRepos,
  avatar,
}) {
  const [texto, setTexto] = useState(usuarioActivo || '')

  function buscar() {
    const v = texto.trim()
    if (v !== filtros.usuario) setFiltro('usuario', v)
  }

  return (
    <div className="mt-4 grid gap-4 rounded-lg border border-white/[0.08] bg-[#0e0f11] p-4 shadow-2xl shadow-black/20">
      <div className="flex flex-wrap items-end gap-2">
        <label htmlFor="usuario" className={'flex-1 ' + LABEL}>
          Usuario u organización
          <input
            id="usuario"
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscar()}
            placeholder="ej: facebook, vercel, torvalds…"
            className={'mt-1 ' + INPUT}
          />
        </label>
        <button
          type="button"
          onClick={buscar}
          className="rounded-md border border-[#007ACC]/50 bg-[#007ACC]/15 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-[#007ACC]/25"
        >
          Buscar
        </button>
      </div>

      {/* Mini-cabecera del usuario buscado */}
      {usuarioActivo && (
        <div className="flex items-center gap-3 rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2">
          {avatar && (
            <img src={avatar} alt="" className="h-8 w-8 rounded-full" />
          )}
          <div className="text-sm">
            <span className="font-medium text-[#f7f8f8]">{usuarioActivo}</span>
            <span className="ml-2 text-xs text-[#8a8f98]">
              {totalRepos} repo{totalRepos === 1 ? '' : 's'} mostrados
            </span>
          </div>
        </div>
      )}

      {/* Controles para refinar la lista ya traída (solo con usuario activo). */}
      {usuarioActivo && (
        <>
          {/* Fila 1: filtrar por palabra + "solo originales" al lado. */}
          <div className="flex flex-wrap items-end gap-4">
            <label htmlFor="filtro-palabra" className={'flex-1 ' + LABEL}>
              Filtrar por palabra (nombre o descripción)
              <input
                id="filtro-palabra"
                type="text"
                value={filtros.keyword}
                onChange={(e) => setFiltro('keyword', e.target.value)}
                placeholder="ej: api, dashboard, cli…"
                className={'mt-1 ' + INPUT}
              />
            </label>
            <label className={'flex cursor-pointer items-center gap-2 pb-2 ' + LABEL}>
              <input
                type="checkbox"
                checked={filtros.soloOriginales}
                onChange={(e) => setFiltro('soloOriginales', e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-[#0a0b0d] accent-[#007ACC]"
              />
              Solo originales (ocultar forks)
            </label>
          </div>

          {/* Fila 2: lenguajes. */}
          <FiltroLenguajes
            disponibles={lenguajesDisponibles}
            seleccionados={filtros.lenguajes}
            onToggle={toggleLenguaje}
          />

          {/* Fila 3: criterio de orden (checkbox de selección única) +
              dirección (radio). */}
          <div className="flex flex-wrap gap-x-10 gap-y-4">
            <fieldset>
              <legend className={LABEL}>Ordenar por</legend>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                {OPCIONES_ORDEN.map((o) => (
                  <label
                    key={o.value}
                    className="flex cursor-pointer items-center gap-2 text-sm text-[#e1e3e6]"
                  >
                    <input
                      type="checkbox"
                      checked={filtros.orden === o.value}
                      onChange={() => setFiltro('orden', o.value)}
                      className="h-4 w-4 rounded border-white/20 bg-[#0a0b0d] accent-[#007ACC]"
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className={LABEL}>Dirección</legend>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                {OPCIONES_DIRECCION.map((o) => (
                  <label
                    key={o.value}
                    className="flex cursor-pointer items-center gap-2 text-sm text-[#e1e3e6]"
                  >
                    <input
                      type="radio"
                      name="ordenDir"
                      checked={filtros.ordenDir === o.value}
                      onChange={() => setFiltro('ordenDir', o.value)}
                      className="h-4 w-4 border-white/20 bg-[#0a0b0d] accent-[#007ACC]"
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </>
      )}
    </div>
  )
}
