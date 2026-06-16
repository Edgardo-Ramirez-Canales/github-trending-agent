import { useState, useMemo } from 'react'
import { useAuth } from './hooks/useAuth.js'
import { useTrendingRepos } from './hooks/useTrendingRepos.js'
import { useFiltros } from './hooks/useFiltros.js'
import { useContributions } from './hooks/useContributions.js'
import { registrarRepoVisto } from './services/supabase.js'
import LoginScreen from './components/LoginScreen.jsx'
import TokenInput from './components/TokenInput.jsx'
import AIProviderSelector from './components/AIProviderSelector.jsx'
import PanelPerfil from './components/PanelPerfil.jsx'
import RepoDetail from './components/RepoDetail.jsx'
import BarraFiltros from './components/filtros/BarraFiltros.jsx'
import SelectorModo from './components/filtros/SelectorModo.jsx'
import BuscadorUsuario from './components/filtros/BuscadorUsuario.jsx'
import BuscadorRepo from './components/filtros/BuscadorRepo.jsx'
import FiltrosActivos from './components/filtros/FiltrosActivos.jsx'
import ListaRepos from './components/ListaRepos.jsx'
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
  const { filtros, filtrosServidor, setFiltro, setFecha, setModo, toggleLenguaje, limpiar } =
    useFiltros()
  const { repos, cargando, error, recargar } = useTrendingRepos(filtrosServidor)
  const [seleccionado, setSeleccionado] = useState(null)

  // Lista de lenguajes disponibles (para el filtro múltiple).
  const lenguajesDisponibles = useMemo(() => {
    const set = new Set(repos.map((r) => r.lenguaje).filter((l) => l && l !== 'N/D'))
    return [...set].sort()
  }, [repos])

  // ¿Sugerir activar "incluir vistos"? Cuando el rango de fecha es amplio.
  const sugerirVistos = useMemo(() => {
    const rangosAmplios = ['6meses', '9meses', 'anioActual', 'ultimoAnio', 'personalizado']
    return filtros.modo === 'trending' && rangosAmplios.includes(filtros.fecha.preset)
  }, [filtros.modo, filtros.fecha.preset])

  // Aplica filtros de CLIENTE + orden y recorta a 15. "En llamas" se fijan arriba.
  // (keyword ya no filtra acá: pasó a búsqueda real en GitHub vía filtrosServidor.)
  const visibles = useMemo(() => {
    let lista = repos.filter((r) => {
      if (filtros.lenguajes.length && !filtros.lenguajes.includes(r.lenguaje)) return false
      if (r.estrellas < filtros.minEstrellas) return false
      if (filtros.maxEstrellas != null && r.estrellas > filtros.maxEstrellas) return false
      if (filtros.velocidadMin && r.velocidad < filtros.velocidadMin) return false
      if (filtros.soloOriginales && r.esFork) return false
      return true
    })

    const comparadores = {
      velocidad: (a, b) => b.velocidad - a.velocidad,
      estrellas: (a, b) => b.estrellas - a.estrellas,
      fecha: (a, b) => new Date(b.creadoEn) - new Date(a.creadoEn),
    }
    lista = [...lista].sort((a, b) => {
      if (a.enLlamas !== b.enLlamas) return a.enLlamas ? -1 : 1
      return comparadores[filtros.orden](a, b)
    })

    return lista.slice(0, 15)
  }, [
    repos,
    filtros.lenguajes,
    filtros.minEstrellas,
    filtros.maxEstrellas,
    filtros.velocidadMin,
    filtros.soloOriginales,
    filtros.orden,
  ])

  async function abrirRepo(repo) {
    setSeleccionado(repo)
    // Al elegir el repo se registra como visto (estrellas actuales).
    try {
      await registrarRepoVisto({ nombre: repo.nombre, estrellas: repo.estrellas })
    } catch {
      /* si falla el registro (ej: sin sesión) no se bloquea la UI */
    }
  }

  const titulos = {
    trending: 'Repos trending',
    usuario: 'Repos por usuario',
    repo: 'Buscar repo',
  }
  const titulo = titulos[filtros.modo] || 'Repos'

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8a8f98]">
          {titulo}
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

      <div className="mt-4">
        <SelectorModo modo={filtros.modo} onModo={setModo} />
      </div>

      {filtros.modo === 'usuario' && (
        <BuscadorUsuario
          filtros={filtros}
          setFiltro={setFiltro}
          toggleLenguaje={toggleLenguaje}
          lenguajesDisponibles={lenguajesDisponibles}
          usuarioActivo={filtros.usuario}
          totalRepos={visibles.length}
          avatar={repos[0]?.avatar}
        />
      )}
      {filtros.modo === 'repo' && (
        <BuscadorRepo
          urlActiva={filtros.urlRepo}
          onBuscar={(v) => setFiltro('urlRepo', v)}
        />
      )}
      {filtros.modo === 'trending' && (
        <BarraFiltros
          filtros={filtros}
          setFiltro={setFiltro}
          setFecha={setFecha}
          toggleLenguaje={toggleLenguaje}
          lenguajesDisponibles={lenguajesDisponibles}
          sugerirVistos={sugerirVistos}
        />
      )}

      <FiltrosActivos
        filtros={filtros}
        setFiltro={setFiltro}
        setFecha={setFecha}
        toggleLenguaje={toggleLenguaje}
        limpiar={limpiar}
      />

      <ListaRepos
        repos={visibles}
        cargando={cargando}
        error={error}
        onSelect={abrirRepo}
        modo={filtros.modo}
      />

      {/* Detalle + análisis con IA */}
      {seleccionado && (
        <RepoDetail repo={seleccionado} onClose={() => setSeleccionado(null)} />
      )}
    </section>
  )
}
