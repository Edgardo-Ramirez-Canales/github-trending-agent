import { useState, useMemo, useEffect } from 'react'
import ContribucionCard from './ContribucionCard.jsx'
import Paginacion from './filtros/Paginacion.jsx'
import { IconSearch } from './icons.jsx'
import {
  cancelarContribucion,
  reabrirContribucion,
  borrarContribucion,
} from '../services/contribuciones.js'

// Filtros de estado (chips). 'todos' no filtra.
const FILTROS = [
  { key: 'todos', label: 'Todas' },
  { key: 'abierto', label: 'Abiertas' },
  { key: 'aceptado', label: 'Aceptadas' },
  { key: 'rechazado', label: 'Rechazadas' },
  { key: 'cancelado', label: 'Canceladas' },
]

const ORDENES = [
  { key: 'reciente', label: 'Más recientes' },
  { key: 'antiguo', label: 'Más antiguas' },
  { key: 'repo', label: 'Repo (A–Z)' },
  { key: 'estado', label: 'Estado' },
]

export default function PanelSeguimiento({ contribuciones = [], onRefrescar, onRevisarAhora }) {
  const [filtro, setFiltro] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState('reciente')
  const [busyId, setBusyId] = useState(null)
  const [revisando, setRevisando] = useState(false)
  const [aviso, setAviso] = useState(null)

  // Conteos por estado para los chips.
  const conteos = useMemo(() => {
    const c = { todos: contribuciones.length }
    for (const x of contribuciones) c[x.estado] = (c[x.estado] || 0) + 1
    return c
  }, [contribuciones])

  const lista = useMemo(() => {
    const kw = busqueda.trim().toLowerCase()
    let l = contribuciones.filter((c) => {
      if (filtro !== 'todos' && c.estado !== filtro) return false
      if (kw && !`${c.repo} ${c.tipo_cambio || ''}`.toLowerCase().includes(kw)) return false
      return true
    })
    const ordenEstado = { abierto: 0, aceptado: 1, rechazado: 2, cancelado: 3 }
    const cmp = {
      reciente: (a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion),
      antiguo: (a, b) => new Date(a.fecha_creacion) - new Date(b.fecha_creacion),
      repo: (a, b) => a.repo.localeCompare(b.repo),
      estado: (a, b) => (ordenEstado[a.estado] ?? 9) - (ordenEstado[b.estado] ?? 9),
    }
    return [...l].sort(cmp[orden])
  }, [contribuciones, filtro, busqueda, orden])

  // Paginación cliente (6 por página), mismo patrón que la sección trending.
  const PAGE_SIZE = 6
  const [pagina, setPagina] = useState(1)
  // Cualquier cambio en el conjunto (filtro, búsqueda, orden, refresco) vuelve
  // a la página 1 para no quedar fuera de rango.
  useEffect(() => {
    setPagina(1)
  }, [filtro, busqueda, orden, lista.length])
  const totalPaginas = Math.ceil(lista.length / PAGE_SIZE) || 1
  const inicio = (pagina - 1) * PAGE_SIZE
  const paginadas = lista.slice(inicio, inicio + PAGE_SIZE)

  // Ejecuta una acción de servicio con manejo de busy + errores + refresco.
  async function ejecutar(c, fn, okMsg) {
    setBusyId(c.id)
    setAviso(null)
    try {
      await fn(c)
      await onRefrescar?.()
      if (okMsg) setAviso({ tipo: 'ok', texto: okMsg })
    } catch (e) {
      setAviso({ tipo: 'error', texto: e?.message || 'No se pudo completar la acción.' })
    } finally {
      setBusyId(null)
    }
  }

  function handleCancelar(c) {
    // Doble confirmación: cierra el PR/issue real en GitHub.
    if (!window.confirm(`¿Cancelar tu ${c.url_pr ? 'PR' : 'issue'} en ${c.repo}? Se cerrará en GitHub.`)) return
    if (!window.confirm('Confirmá de nuevo: esta acción cierra el PR/issue en GitHub.')) return
    ejecutar(c, cancelarContribucion, 'Contribución cancelada y cerrada en GitHub.')
  }

  function handleReabrir(c) {
    ejecutar(c, reabrirContribucion, 'Contribución reabierta en GitHub.')
  }

  function handleBorrar(c) {
    if (!window.confirm('¿Quitar del historial? No afecta al PR/issue en GitHub.')) return
    ejecutar(c, borrarContribucion, 'Eliminada del historial.')
  }

  async function handleRevisar() {
    setRevisando(true)
    setAviso(null)
    try {
      const cambios = await onRevisarAhora?.()
      setAviso({
        tipo: 'ok',
        texto: cambios > 0 ? `${cambios} estado(s) actualizado(s).` : 'Sin cambios nuevos.',
      })
    } catch {
      setAviso({ tipo: 'error', texto: 'No se pudo revisar ahora.' })
    } finally {
      setRevisando(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8a8f98]">
          Mis contribuciones
        </h2>
        <button
          type="button"
          onClick={handleRevisar}
          disabled={revisando}
          className="rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-[#e1e3e6] transition hover:border-[#007ACC]/50 hover:bg-[#007ACC]/10 disabled:opacity-50"
        >
          {revisando ? 'Revisando…' : 'Revisar ahora'}
        </button>
      </div>

      {/* Chips de estado */}
      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const activo = filtro === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFiltro(f.key)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                activo
                  ? 'border-[#007ACC]/60 bg-[#007ACC]/15 text-[#7cc7ff]'
                  : 'border-white/[0.08] bg-white/[0.03] text-[#8a8f98] hover:text-[#e1e3e6]'
              }`}
            >
              {f.label}
              <span className="ml-1.5 text-[#62666d]">{conteos[f.key] || 0}</span>
            </button>
          )
        })}
      </div>

      {/* Búsqueda + orden */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#62666d]" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por repo o tipo…"
            className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] py-1.5 pl-8 pr-3 text-sm text-[#e1e3e6] placeholder:text-[#62666d] focus:border-[#007ACC]/50 focus:outline-none"
          />
        </div>
        <select
          value={orden}
          onChange={(e) => setOrden(e.target.value)}
          className="rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-[#e1e3e6] focus:border-[#007ACC]/50 focus:outline-none"
        >
          {ORDENES.map((o) => (
            <option key={o.key} value={o.key} className="bg-[#0e0f11]">
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {aviso && (
        <p
          className={`rounded-md border px-3 py-2 text-sm ${
            aviso.tipo === 'ok'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/30 bg-red-500/10 text-red-300'
          }`}
        >
          {aviso.texto}
        </p>
      )}

      {/* Lista */}
      {lista.length === 0 ? (
        <div className="rounded-md border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-10 text-center text-sm text-[#62666d]">
          {contribuciones.length === 0
            ? 'Aún no hay contribuciones. Abre un issue (Modo B) o un PR (Modo C) y aparecerán aquí.'
            : 'No hay contribuciones que coincidan con el filtro.'}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {paginadas.map((c) => (
              <ContribucionCard
                key={c.id}
                c={c}
                busy={busyId === c.id}
                onCancelar={handleCancelar}
                onReabrir={handleReabrir}
                onBorrar={handleBorrar}
              />
            ))}
          </div>
          <Paginacion pagina={pagina} totalPaginas={totalPaginas} onPagina={setPagina} />
        </>
      )}
    </section>
  )
}
