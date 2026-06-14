import { useState, useMemo } from 'react'
import { useAuth } from './hooks/useAuth.js'
import { useTrendingRepos } from './hooks/useTrendingRepos.js'
import { useContributions } from './hooks/useContributions.js'
import { registrarRepoVisto } from './services/supabase.js'
import LoginScreen from './components/LoginScreen.jsx'
import TokenInput from './components/TokenInput.jsx'
import AIProviderSelector from './components/AIProviderSelector.jsx'
import PanelPerfil from './components/PanelPerfil.jsx'
import RepoCard from './components/RepoCard.jsx'
import RepoDetail from './components/RepoDetail.jsx'
import NotificationBadge from './components/NotificationBadge.jsx'
import NotificationPanel from './components/NotificationPanel.jsx'

export default function App() {
  const { usuario, cargando, error, login, cerrarSesion } = useAuth()

  if (cargando) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <p className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[#8a8f98] shadow-2xl shadow-black/30">
          Cargando sesión…
        </p>
      </div>
    )
  }

  if (!usuario) {
    return <LoginScreen onLogin={login} error={error} cargando={false} />
  }

  return <AppAutenticado usuario={usuario} onCerrarSesion={cerrarSesion} />
}

// ----------------------------------------------------------------------------
// Vista autenticada (separada para que los hooks de notificaciones sean válidos).
// ----------------------------------------------------------------------------
function AppAutenticado({ usuario, onCerrarSesion }) {
  const { contribuciones, notificaciones, noLeidas, marcarLeida, marcarTodas } =
    useContributions(usuario.email)
  const [panelAbierto, setPanelAbierto] = useState(false)

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-[#08090a]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3">
          <h1 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-[#f7f8f8]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#007ACC] shadow-[0_0_10px_rgba(0,122,204,0.5)]" />
            <span className="text-[#7cc7ff]">EDR Labs</span>
            <span className="text-[#4a4d54]">/</span>
            <span>GitHub Trending Agent</span>
          </h1>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-[#8a8f98] sm:inline">
              {usuario.user_metadata?.user_name || usuario.email}
            </span>

            <div className="relative">
              <NotificationBadge
                count={noLeidas}
                onClick={() => setPanelAbierto((v) => !v)}
              />
              {panelAbierto && (
                <NotificationPanel
                  notificaciones={notificaciones}
                  onMarcarLeida={marcarLeida}
                  onMarcarTodas={marcarTodas}
                  onCerrar={() => setPanelAbierto(false)}
                />
              )}
            </div>

            <button
              type="button"
              onClick={onCerrarSesion}
              className="rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm font-medium text-[#e1e3e6] shadow-sm transition hover:border-white/[0.1] hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007ACC]"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-5 py-6">
        <PanelPerfil usuario={usuario} contribuciones={contribuciones} />

        <section className="grid gap-4 md:grid-cols-2">
          <TokenInput contribuciones={contribuciones} />
          <AIProviderSelector />
        </section>

        <TrendingSection />
      </main>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Sección de repos trending: filtros + lista de 15.
// ----------------------------------------------------------------------------
function TrendingSection() {
  const { repos, cargando, error, recargar } = useTrendingRepos()
  const [seleccionado, setSeleccionado] = useState(null)

  // Estado de filtros.
  const [lenguajes, setLenguajes] = useState([]) // multi-select
  const [minEstrellas, setMinEstrellas] = useState(100)
  const [keyword, setKeyword] = useState('')
  const [orden, setOrden] = useState('velocidad')

  // Lista de lenguajes disponibles (para el filtro múltiple).
  const lenguajesDisponibles = useMemo(() => {
    const set = new Set(repos.map((r) => r.lenguaje).filter((l) => l && l !== 'N/D'))
    return [...set].sort()
  }, [repos])

  // Aplica filtros + orden y recorta a 15. "En llamas" siempre se fijan arriba.
  const visibles = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    let lista = repos.filter((r) => {
      if (lenguajes.length && !lenguajes.includes(r.lenguaje)) return false
      if (r.estrellas < minEstrellas) return false
      if (kw) {
        const heno = `${r.nombre} ${r.descripcion} ${r.topics.join(' ')}`.toLowerCase()
        if (!heno.includes(kw)) return false
      }
      return true
    })

    const comparadores = {
      velocidad: (a, b) => b.velocidad - a.velocidad,
      estrellas: (a, b) => b.estrellas - a.estrellas,
      fecha: (a, b) => new Date(b.creadoEn) - new Date(a.creadoEn),
    }
    lista = [...lista].sort((a, b) => {
      if (a.enLlamas !== b.enLlamas) return a.enLlamas ? -1 : 1
      return comparadores[orden](a, b)
    })

    return lista.slice(0, 15)
  }, [repos, lenguajes, minEstrellas, keyword, orden])

  function toggleLenguaje(l) {
    setLenguajes((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l],
    )
  }

  async function abrirRepo(repo) {
    setSeleccionado(repo)
    // Al elegir el repo se registra como visto (estrellas actuales).
    try {
      await registrarRepoVisto({ nombre: repo.nombre, estrellas: repo.estrellas })
    } catch {
      /* si falla el registro (ej: sin sesión) no se bloquea la UI */
    }
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8a8f98]">
          Repos trending
          {!cargando && (
            <span className="ml-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-xs font-medium normal-case tracking-normal text-[#c4c7cc]">
              {visibles.length} mostrados
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={recargar}
          className="rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-[#e1e3e6] transition hover:border-[#007ACC]/50 hover:bg-[#007ACC]/10"
        >
          Recargar
        </button>
      </div>

      {/* Filtros */}
      <div className="mt-4 grid gap-4 rounded-lg border border-white/[0.08] bg-[#0e0f11] p-4 shadow-2xl shadow-black/20 md:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-[#8a8f98]">
            Estrellas mínimas: {minEstrellas.toLocaleString('es')}
          </label>
          <input
            type="range"
            min="0"
            max="20000"
            step="100"
            value={minEstrellas}
            onChange={(e) => setMinEstrellas(Number(e.target.value))}
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
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="ej: cli, ai, rust…"
            className="mt-1 w-full rounded-md border border-white/[0.08] bg-[#0a0b0d] px-3 py-2 text-sm text-[#f7f8f8] placeholder:text-[#4a4d54] outline-none transition focus:border-[#007ACC]/70 focus:ring-2 focus:ring-[#007ACC]/25"
          />
        </div>

        <div className="md:col-span-2">
          <span className="text-xs font-medium text-[#8a8f98]">Lenguaje</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {lenguajesDisponibles.length === 0 && (
              <span className="text-xs text-[#62666d]">—</span>
            )}
            {lenguajesDisponibles.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => toggleLenguaje(l)}
                className={
                  'rounded-md px-2.5 py-1 text-xs font-medium transition ' +
                  (lenguajes.includes(l)
                    ? 'bg-[#007ACC]/18 text-sky-100 ring-1 ring-[#007ACC]/50'
                    : 'bg-white/[0.04] text-[#c4c7cc] ring-1 ring-white/[0.08] hover:bg-white/[0.07]')
                }
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="orden" className="text-xs font-medium text-[#8a8f98]">
            Ordenar por
          </label>
          <select
            id="orden"
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/[0.08] bg-[#0a0b0d] px-3 py-2 text-sm text-[#f7f8f8] outline-none transition focus:border-[#007ACC]/70 focus:ring-2 focus:ring-[#007ACC]/25"
          >
            <option value="velocidad">Velocidad de crecimiento</option>
            <option value="estrellas">Total de estrellas</option>
            <option value="fecha">Fecha de creación</option>
          </select>
        </div>
      </div>

      {/* Estados */}
      {cargando && (
        <p className="mt-6 text-center text-[#8a8f98]">Buscando repos…</p>
      )}
      {error && (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Lista */}
      {!cargando && !error && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((r) => (
            <RepoCard key={r.id} repo={r} onSelect={abrirRepo} />
          ))}
          {visibles.length === 0 && (
            <p className="col-span-full text-center text-[#62666d]">
              Ningún repo coincide con los filtros.
            </p>
          )}
        </div>
      )}

      {/* Detalle + análisis con IA */}
      {seleccionado && (
        <RepoDetail repo={seleccionado} onClose={() => setSeleccionado(null)} />
      )}
    </section>
  )
}
