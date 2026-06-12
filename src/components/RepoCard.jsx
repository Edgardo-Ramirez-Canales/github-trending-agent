// Tarjeta de un repo en la lista trending. Click → abre el panel de detalle.
export default function RepoCard({ repo, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(repo)}
      className="group flex w-full flex-col gap-3 rounded-xl bg-slate-800/60 p-4 text-left ring-1 ring-slate-700 transition hover:bg-slate-800 hover:ring-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {repo.avatar && (
            <img
              src={repo.avatar}
              alt=""
              className="h-6 w-6 shrink-0 rounded-full ring-1 ring-slate-600"
              loading="lazy"
            />
          )}
          <span className="truncate font-semibold text-slate-100 group-hover:text-white">
            {repo.nombre}
          </span>
        </div>
        {repo.enLlamas && (
          <span className="shrink-0 rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-semibold text-orange-300">
            🔥 +{repo.diffEstrellas.toLocaleString('es')} desde que lo viste
          </span>
        )}
      </div>

      {repo.descripcion && (
        <p className="line-clamp-2 text-sm text-slate-400">{repo.descripcion}</p>
      )}

      {repo.topics?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {repo.topics.slice(0, 4).map((t) => (
            <span
              key={t}
              className="rounded-md bg-slate-700/60 px-1.5 py-0.5 text-xs text-slate-300"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
        {repo.lenguaje !== 'N/D' && (
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {repo.lenguaje}
          </span>
        )}
        <span>★ {repo.estrellas.toLocaleString('es')}</span>
        <span className="text-emerald-300">↑ {repo.velocidad}/día</span>
        <span>{repo.issuesAbiertos} issues</span>
      </div>
    </button>
  )
}
