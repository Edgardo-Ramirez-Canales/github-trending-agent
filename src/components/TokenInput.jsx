import { useState, useMemo } from 'react'
import {
  getGithubToken,
  getGithubTokenSource,
  setGithubToken,
  clearGithubToken,
} from '../utils/storage.js'
import {
  calcularStats,
  calcularActividad,
  calcularCategorias,
} from '../utils/logros.js'
import { META_POR_CLAVE } from '../utils/categorias.js'

// Input del GitHub Token. Normalmente ya viene del login OAuth (source 'oauth');
// el usuario puede sobreescribirlo manualmente (override) o borrarlo.
// Sin token, la app funciona en modo limitado (60 req/h).
export default function TokenInput({ onChange, contribuciones = [] }) {
  const [token, setToken] = useState(getGithubToken())
  const [source, setSource] = useState(getGithubTokenSource())
  const [visible, setVisible] = useState(false)

  function guardar(nuevo) {
    setToken(nuevo)
    setGithubToken(nuevo, 'manual')
    setSource(nuevo ? 'manual' : '')
    onChange?.(nuevo)
  }

  function limpiar() {
    setToken('')
    clearGithubToken()
    setSource('')
    onChange?.('')
  }

  const tieneToken = Boolean(token)

  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#0e0f11] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_1px_2px_0_rgba(0,0,0,0.3)]">
      <ActividadResumen contribuciones={contribuciones} />

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-4">
        <label htmlFor="gh-token" className="text-sm font-semibold text-[#e1e3e6]">
          GitHub Token
        </label>
        {tieneToken ? (
          <span
            className={
              'rounded-full px-2.5 py-0.5 text-xs font-medium ' +
              (source === 'oauth'
                ? 'bg-[#007ACC]/15 text-[#7cc7ff] ring-1 ring-[#007ACC]/30'
                : 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/25')
            }
          >
            {source === 'oauth' ? 'desde login OAuth' : 'manual'}
          </span>
        ) : (
          <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-300 ring-1 ring-amber-500/25">
            modo limitado (60 req/h)
          </span>
        )}
      </div>

      <div className="mt-2 flex items-stretch gap-2">
        <input
          id="gh-token"
          type={visible ? 'text' : 'password'}
          value={token}
          onChange={(e) => guardar(e.target.value)}
          placeholder="ghp_… (override manual opcional)"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-md border border-white/[0.08] bg-[#0a0b0d] px-3 py-2 text-sm text-[#f7f8f8] placeholder:text-[#4a4d54] outline-none transition focus:border-[#007ACC]/70 focus:ring-2 focus:ring-[#007ACC]/25"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="rounded-md border border-white/[0.08] bg-white/[0.04] px-3 text-xs font-medium text-[#e1e3e6] transition hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007ACC]"
          aria-label={visible ? 'Ocultar token' : 'Mostrar token'}
        >
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
        {tieneToken && (
          <button
            type="button"
            onClick={limpiar}
            className="rounded-md bg-red-500/15 px-3 text-xs font-medium text-red-300 ring-1 ring-red-500/25 hover:bg-red-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            Borrar
          </button>
        )}
      </div>

      <p className="mt-2 text-xs text-[#62666d]">
        Se guarda solo en este navegador (localStorage). Nunca se envía a Supabase
        ni al servidor.
      </p>
    </div>
  )
}

// Opciones del filtro de granularidad del sparkline (8 cubos de cada unidad).
const RANGOS = [
  { unidad: 'dia', label: 'Días', sufijo: 'últimos 8 días' },
  { unidad: 'semana', label: 'Semanas', sufijo: 'últimas 8 semanas' },
  { unidad: 'mes', label: 'Meses', sufijo: 'últimos 8 meses' },
]

// Formatea la etiqueta del tooltip de cada barra según la unidad activa.
function etiquetaBarra(unidad, inicio, total) {
  if (unidad === 'mes') {
    const m = inicio.toLocaleDateString('es', { month: 'long', year: '2-digit' })
    return `${m}: ${total}`
  }
  if (unidad === 'semana') {
    return `Semana de ${inicio.toLocaleDateString('es')}: ${total}`
  }
  return `${inicio.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}: ${total}`
}

// Bloque "Tu actividad": sparkline filtrable (días/semanas/meses) + desglose
// PR/Issue + categoría top. Vive aquí para aprovechar el espacio del card.
function ActividadResumen({ contribuciones }) {
  const [unidad, setUnidad] = useState('semana')

  const { serie, stats, categorias } = useMemo(
    () => ({
      serie: calcularActividad(contribuciones, unidad, 8),
      stats: calcularStats(contribuciones),
      categorias: calcularCategorias(contribuciones, META_POR_CLAVE),
    }),
    [contribuciones, unidad],
  )

  const maxValor = Math.max(1, ...serie.map((s) => s.total))
  const rango = RANGOS.find((r) => r.unidad === unidad)

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#8a8f98]">
          Tu actividad
        </h3>
        {/* Filtro segmentado de granularidad */}
        <div className="flex rounded-md bg-white/[0.04] p-0.5 ring-1 ring-white/[0.06]">
          {RANGOS.map((r) => (
            <button
              key={r.unidad}
              type="button"
              onClick={() => setUnidad(r.unidad)}
              className={
                'rounded px-2 py-0.5 text-[11px] font-medium transition ' +
                (unidad === r.unidad
                  ? 'bg-[#007ACC]/20 text-[#7cc7ff] ring-1 ring-[#007ACC]/30'
                  : 'text-[#62666d] hover:text-[#8a8f98]')
              }
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {stats.total === 0 ? (
        <p className="mt-3 text-xs text-[#4a4d54]">
          Sin actividad aún. Tus issues (Modo B) y PRs (Modo C) aparecerán aquí.
        </p>
      ) : (
        <>
          <p className="mt-2 text-[11px] text-[#4a4d54]">{rango.sufijo}</p>

          {/* Sparkline de mini-barras según la unidad activa */}
          <div className="mt-2 flex h-12 items-end gap-1">
            {serie.map((s, i) => {
              const alto = s.total === 0 ? 6 : 12 + (s.total / maxValor) * 88
              return (
                <div
                  key={i}
                  title={etiquetaBarra(unidad, s.inicio, s.total)}
                  className={
                    'flex-1 rounded-sm transition-all ' +
                    (s.total > 0 ? 'bg-[#007ACC]/70' : 'bg-white/[0.05]')
                  }
                  style={{ height: `${alto}%` }}
                />
              )
            })}
          </div>

          {/* Desglose PR / Issue */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            <span className="flex items-center gap-1.5 text-[#8a8f98]">
              <span className="h-2 w-2 rounded-full bg-[#007ACC]" />
              PRs <span className="font-semibold text-[#e1e3e6]">{stats.prs}</span>
            </span>
            <span className="flex items-center gap-1.5 text-[#8a8f98]">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              Issues{' '}
              <span className="font-semibold text-[#e1e3e6]">{stats.issues}</span>
            </span>
          </div>

          {/* Categorías usadas, ordenadas por frecuencia (top primero) */}
          {categorias.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] uppercase tracking-wide text-[#62666d]">
                Categorías
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {categorias.map((cat, i) => (
                  <span
                    key={cat.clave}
                    className={
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ' +
                      cat.chip +
                      (i === 0 ? ' ring-1 ring-white/20' : '')
                    }
                    title={i === 0 ? 'Categoría más usada' : undefined}
                  >
                    {cat.label}
                    <span className="font-semibold tabular-nums">{cat.total}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
