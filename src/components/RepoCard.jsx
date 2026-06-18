import { IconFlame, IconExternalLink, IconClock } from './icons.jsx'

// Formatea una fecha ISO a texto relativo en español ("hace 3 días", "hoy").
function tiempoRelativo(iso) {
  if (!iso) return null
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return null
  const segundos = Math.round((Date.now() - fecha.getTime()) / 1000)
  if (segundos < 60) return 'hace instantes'
  const min = Math.round(segundos / 60)
  if (min < 60) return `hace ${min} min`
  const horas = Math.round(min / 60)
  if (horas < 24) return `hace ${horas} h`
  const dias = Math.round(horas / 24)
  if (dias === 0) return 'hoy'
  if (dias < 30) return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`
  const meses = Math.round(dias / 30)
  if (meses < 12) return `hace ${meses} ${meses === 1 ? 'mes' : 'meses'}`
  const anios = Math.round(meses / 12)
  return `hace ${anios} ${anios === 1 ? 'año' : 'años'}`
}

// Fecha absoluta (DD/MM/AAAA) para tooltips.
function fechaAbsoluta(iso) {
  if (!iso) return ''
  const f = new Date(iso)
  return Number.isNaN(f.getTime()) ? '' : f.toLocaleDateString('es')
}

// Tarjeta de un repo en la lista trending.
// Click en la tarjeta → abre el panel de detalle (análisis).
// Click en el enlace externo → abre el repo en GitHub (no dispara el análisis).
export default function RepoCard({ repo, onSelect }) {
  const seleccionar = () => onSelect?.(repo)
  const creado = tiempoRelativo(repo.creadoEn)
  const actividad = tiempoRelativo(repo.actualizadoEn)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={seleccionar}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          seleccionar()
        }
      }}
      className="group flex w-full cursor-pointer flex-col gap-3 rounded-lg border border-white/[0.08] bg-[#0e0f11] p-4 text-left shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_1px_2px_0_rgba(0,0,0,0.4)] transition duration-150 hover:border-[#007ACC]/45 hover:bg-[#121316] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_8px_24px_-8px_rgba(0,0,0,0.6)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007ACC]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {repo.avatar && (
            <img
              src={repo.avatar}
              alt=""
              className="h-6 w-6 shrink-0 rounded-full ring-1 ring-white/[0.1]"
              loading="lazy"
            />
          )}
          <span className="truncate text-sm font-semibold text-[#f7f8f8] group-hover:text-white">
            {repo.nombre}
          </span>
          {repo.privado && (
            <span className="shrink-0 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300 ring-1 ring-amber-500/25">
              Privado
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {repo.enLlamas && (
            <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/15 px-2 py-0.5 text-xs font-semibold text-orange-300 ring-1 ring-orange-500/25">
              <IconFlame className="h-3.5 w-3.5" />
              +{repo.diffEstrellas.toLocaleString('es')} desde que lo viste
            </span>
          )}
          {repo.url && (
            <a
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Abrir en GitHub"
              aria-label="Abrir en GitHub"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#8a8f98] ring-1 ring-white/[0.08] transition hover:bg-white/[0.06] hover:text-[#7cc7ff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007ACC]"
            >
              <IconExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>

      {repo.descripcion && (
        <p className="line-clamp-2 text-sm leading-6 text-[#8a8f98]">{repo.descripcion}</p>
      )}

      {repo.topics?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {repo.topics.slice(0, 4).map((t) => (
            <span
              key={t}
              className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-xs text-[#c4c7cc] ring-1 ring-white/[0.08]"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#8a8f98]">
        {repo.lenguaje !== 'N/D' && (
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#007ACC]" />
            {repo.lenguaje}
          </span>
        )}
        <span>★ {repo.estrellas.toLocaleString('es')}</span>
        <span className="text-[#7cc7ff]">↑ {repo.velocidad}/día</span>
        <span>{repo.issuesAbiertos} issues</span>
        {creado && (
          <span title={`Creado el ${fechaAbsoluta(repo.creadoEn)}`}>
            Creado {creado}
          </span>
        )}
        {actividad && (
          <span
            className="inline-flex items-center gap-1"
            title={`Última actividad el ${fechaAbsoluta(repo.actualizadoEn)}`}
          >
            <IconClock className="h-3.5 w-3.5" />
            {actividad}
          </span>
        )}
      </div>
    </div>
  )
}
