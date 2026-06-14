import { useGithubProfile } from '../hooks/useGithubProfile.js'

// Tarjeta de identidad: avatar + nombre + handle + mini-métricas de GitHub.
// Fuente principal: GitHub API /user (useGithubProfile). Si no hay token,
// cae al avatar/nombre de la sesión OAuth de Supabase (prop `usuario`).
export default function PerfilUsuario({ usuario }) {
  const { perfil, cargando } = useGithubProfile()

  const meta = usuario?.user_metadata ?? {}
  const avatar = perfil?.avatar_url || meta.avatar_url
  const nombre = perfil?.name || meta.full_name || meta.user_name || 'Usuario'
  const handle = perfil?.login || meta.user_name
  const urlPerfil = perfil?.html_url || (handle ? `https://github.com/${handle}` : null)

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        {cargando && !avatar ? (
          <div className="h-16 w-16 animate-pulse rounded-full bg-white/[0.06] ring-1 ring-white/[0.08]" />
        ) : avatar ? (
          <img
            src={avatar}
            alt={`Avatar de ${nombre}`}
            className="h-16 w-16 rounded-full object-cover ring-2 ring-[#007ACC]/40"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#007ACC]/15 text-xl font-semibold text-[#7cc7ff] ring-1 ring-[#007ACC]/30">
            {nombre.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-[#0e0f11]" />
      </div>

      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-[#f7f8f8]">{nombre}</p>
        {handle && (
          <a
            href={urlPerfil}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-[#7cc7ff] transition hover:text-[#a8d8ff] hover:underline"
          >
            @{handle}
          </a>
        )}
        {perfil && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Metric label="repos" valor={perfil.public_repos} />
            <Metric label="seguidores" valor={perfil.followers} />
            <Metric label="siguiendo" valor={perfil.following} />
          </div>
        )}
      </div>
    </div>
  )
}

function Metric({ label, valor }) {
  return (
    <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-xs text-[#8a8f98] ring-1 ring-white/[0.06]">
      <span className="font-semibold text-[#e1e3e6]">{valor ?? 0}</span> {label}
    </span>
  )
}
