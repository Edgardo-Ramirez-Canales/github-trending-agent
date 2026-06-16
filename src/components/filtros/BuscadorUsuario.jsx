import { useState } from 'react'
import FiltroLenguajes from './FiltroLenguajes.jsx'

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
        <label htmlFor="usuario" className="flex-1 text-xs font-medium text-[#8a8f98]">
          Usuario u organización
          <input
            id="usuario"
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscar()}
            placeholder="ej: facebook, vercel, torvalds…"
            className="mt-1 w-full rounded-md border border-white/[0.08] bg-[#0a0b0d] px-3 py-2 text-sm text-[#f7f8f8] placeholder:text-[#4a4d54] outline-none transition focus:border-[#007ACC]/70 focus:ring-2 focus:ring-[#007ACC]/25"
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

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[#8a8f98]">
          <input
            type="checkbox"
            checked={filtros.soloOriginales}
            onChange={(e) => setFiltro('soloOriginales', e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-[#0a0b0d] accent-[#007ACC]"
          />
          Solo originales (ocultar forks)
        </label>

        <label htmlFor="ordenU" className="text-xs font-medium text-[#8a8f98]">
          Ordenar por
          <select
            id="ordenU"
            value={filtros.orden}
            onChange={(e) => setFiltro('orden', e.target.value)}
            className="ml-2 rounded-md border border-white/[0.08] bg-[#0a0b0d] px-2 py-1.5 text-sm text-[#f7f8f8] outline-none transition focus:border-[#007ACC]/70 focus:ring-2 focus:ring-[#007ACC]/25"
          >
            <option value="estrellas">Total de estrellas</option>
            <option value="velocidad">Velocidad de crecimiento</option>
            <option value="fecha">Fecha de creación</option>
          </select>
        </label>
      </div>

      <FiltroLenguajes
        disponibles={lenguajesDisponibles}
        seleccionados={filtros.lenguajes}
        onToggle={toggleLenguaje}
      />
    </div>
  )
}
