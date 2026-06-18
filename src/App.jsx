import { useState, useMemo, useEffect } from 'react'
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
import Paginacion from './components/filtros/Paginacion.jsx'
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
    // Modo repo: búsqueda deliberada de UN repo concreto. No aplicamos ningún
    // filtro de cliente (estrellas, velocidad, lenguaje…); si lo pediste por
    // nombre, querés verlo siempre.
    if (filtros.modo === 'repo') return repos

    // En modo usuario la UI no expone los controles de estrellas ni velocidad,
    // así que no se aplican (queremos ver TODOS los repos del usuario). Solo
    // recortan lenguaje y "solo originales", que sí tienen control en pantalla.
    const esUsuario = filtros.modo === 'usuario'
    // En modo usuario, la palabra clave filtra EN CLIENTE sobre la lista ya
    // traída (nombre + descripción). En trending ya filtra vía servidor.
    const kw = esUsuario ? filtros.keyword.trim().toLowerCase() : ''
    let lista = repos.filter((r) => {
      if (filtros.lenguajes.length && !filtros.lenguajes.includes(r.lenguaje)) return false
      if (!esUsuario && r.estrellas < filtros.minEstrellas) return false
      if (!esUsuario && filtros.maxEstrellas != null && r.estrellas > filtros.maxEstrellas) return false
      if (!esUsuario && filtros.velocidadMin && r.velocidad < filtros.velocidadMin) return false
      if (filtros.soloOriginales && r.esFork) return false
      if (kw && !`${r.nombre} ${r.descripcion}`.toLowerCase().includes(kw)) return false
      return true
    })

    // Comparadores en orden descendente base; la dirección se aplica con un
    // factor (solo en modo usuario; trending siempre desc).
    const comparadores = {
      velocidad: (a, b) => b.velocidad - a.velocidad,
      estrellas: (a, b) => b.estrellas - a.estrellas,
      fecha: (a, b) => new Date(b.creadoEn) - new Date(a.creadoEn),
    }
    const factor = esUsuario && filtros.ordenDir === 'asc' ? -1 : 1
    lista = [...lista].sort((a, b) => {
      // El fijado de "en llamas" solo tiene sentido en trending.
      if (!esUsuario && a.enLlamas !== b.enLlamas) return a.enLlamas ? -1 : 1
      return factor * comparadores[filtros.orden](a, b)
    })

    // Devolvemos la lista filtrada+ordenada COMPLETA. El recorte por página se
    // hace después (paginación), no acá: así los filtros siguen operando sobre
    // todo el conjunto y la paginación solo decide qué tramo se ve.
    return lista
  }, [
    repos,
    filtros.modo,
    filtros.keyword,
    filtros.lenguajes,
    filtros.minEstrellas,
    filtros.maxEstrellas,
    filtros.velocidadMin,
    filtros.soloOriginales,
    filtros.orden,
    filtros.ordenDir,
  ])

  // Paginación cliente: recorta `visibles` (ya filtrado y ordenado) en páginas de
  // 6. No toca los filtros; solo decide qué tramo se muestra. Repo queda con 1
  // resultado → 1 página → Paginacion se auto-oculta.
  const PAGE_SIZE = 6
  const [pagina, setPagina] = useState(1)
  // Cualquier cambio en el conjunto filtrado (filtros, orden, modo, recarga)
  // vuelve a la página 1 para no quedar fuera de rango.
  useEffect(() => {
    setPagina(1)
  }, [visibles])
  const totalPaginas = Math.ceil(visibles.length / PAGE_SIZE) || 1
  const inicio = (pagina - 1) * PAGE_SIZE
  const paginados = visibles.slice(inicio, inicio + PAGE_SIZE)

  async function abrirRepo(repo) {
    setSeleccionado(repo)
    // Al elegir el repo se registra como visto (estrellas actuales).
    try {
      await registrarRepoVisto({ nombre: repo.nombre, estrellas: repo.estrellas })
    } catch {
      /* si falla el registro (ej: sin sesión) no se bloquea la UI */
    }
  }

  // Cambiar de modo: además de cambiar los filtros, cerramos el detalle/análisis
  // abierto (es del modo anterior) para no arrastrarlo al modo nuevo.
  function cambiarModo(m) {
    setModo(m)
    setSeleccionado(null)
  }

  const titulos = {
    trending: 'Descubrir repos',
    usuario: 'Repos por autor',
    repo: 'Repo directo',
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
        <SelectorModo modo={filtros.modo} onModo={cambiarModo} />
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
        repos={paginados}
        cargando={cargando}
        error={error}
        onSelect={abrirRepo}
        modo={filtros.modo}
      />

      {!cargando && !error && (
        <Paginacion pagina={pagina} totalPaginas={totalPaginas} onPagina={setPagina} />
      )}

      {/* Detalle + análisis con IA */}
      {seleccionado && (
        <RepoDetail repo={seleccionado} onClose={() => setSeleccionado(null)} />
      )}
    </section>
  )
}
