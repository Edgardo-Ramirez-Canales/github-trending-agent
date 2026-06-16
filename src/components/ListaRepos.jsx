import RepoCard from './RepoCard.jsx'

// Mensaje de vacío según el modo activo.
const VACIO = {
  trending: 'Ningún repo coincide con los filtros.',
  usuario: 'Escribí un usuario u organización y tocá Buscar.',
  repo: 'Pegá la URL o el nombre (owner/repo) y tocá Buscar.',
}

// Lista de repos + estados (cargando / error / vacío). Sin lógica de filtros.
export default function ListaRepos({ repos, cargando, error, onSelect, modo = 'trending' }) {
  return (
    <>
      {cargando && (
        <p className="mt-6 text-center text-[#8a8f98]">Buscando repos…</p>
      )}
      {error && (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-300">
          {error}
        </div>
      )}

      {!cargando && !error && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {repos.map((r) => (
            <RepoCard key={r.id} repo={r} onSelect={onSelect} />
          ))}
          {repos.length === 0 && (
            <p className="col-span-full text-center text-[#62666d]">
              {VACIO[modo] || VACIO.trending}
            </p>
          )}
        </div>
      )}
    </>
  )
}
