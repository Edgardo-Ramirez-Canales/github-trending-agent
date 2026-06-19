import { IconExternalLink, IconClock, IconAlert, IconX } from './icons.jsx'

// Metadatos visuales por estado (mismos colores que StatsContribuciones).
const ESTADOS = {
  abierto: { label: 'Abierto', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  aceptado: { label: 'Aceptado', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  rechazado: { label: 'Rechazado', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  cancelado: { label: 'Cancelado', color: '#a1a1aa', bg: 'rgba(161,161,170,0.12)' },
}

// Días que un PR/issue abierto puede pasar sin respuesta antes de marcarse "stale".
const STALE_DIAS = 14

function fmtFecha(iso) {
  if (!iso) return ''
  const f = new Date(iso)
  return Number.isNaN(f.getTime()) ? '' : f.toLocaleDateString('es')
}

function diasDesde(iso) {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  return Number.isNaN(ms) ? null : Math.floor(ms / 86_400_000)
}

export default function ContribucionCard({ c, onCancelar, onReabrir, onBorrar, busy }) {
  const meta = ESTADOS[c.estado] || ESTADOS.abierto
  const url = c.url_pr || c.url_issue
  const esPR = Boolean(c.url_pr)
  const dias = diasDesde(c.fecha_creacion)
  const stale = c.estado === 'abierto' && dias != null && dias >= STALE_DIAS

  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#0e0f11] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{ color: meta.color, backgroundColor: meta.bg }}
            >
              {meta.label}
            </span>
            <span className="rounded border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#8a8f98]">
              {esPR ? 'PR' : 'Issue'} · Modo {c.modo}
            </span>
            {stale && (
              <span className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-xs font-medium text-amber-300">
                <IconAlert className="h-3 w-3" />
                Sin respuesta {dias}d
              </span>
            )}
          </div>
          <p className="mt-1.5 truncate text-sm font-medium text-[#e1e3e6]">{c.repo}</p>
          {c.tipo_cambio && (
            <p className="truncate text-xs text-[#62666d]">{c.tipo_cambio}</p>
          )}
          <p className="mt-1 flex items-center gap-1 text-xs text-[#62666d]">
            <IconClock className="h-3 w-3" />
            Creado {fmtFecha(c.fecha_creacion)}
            {c.fecha_actualizacion &&
              c.fecha_actualizacion !== c.fecha_creacion &&
              ` · act. ${fmtFecha(c.fecha_actualizacion)}`}
          </p>
        </div>

        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-md border border-white/[0.08] bg-white/[0.04] p-1.5 text-[#8a8f98] transition hover:border-[#007ACC]/50 hover:text-[#7cc7ff]"
            title="Abrir en GitHub"
          >
            <IconExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      {/* Acciones según estado */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {c.estado === 'abierto' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onCancelar(c)}
            className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
          >
            <IconX className="h-3.5 w-3.5" />
            Cancelar
          </button>
        )}
        {c.estado === 'cancelado' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onReabrir(c)}
            className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-50"
          >
            Reabrir
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => onBorrar(c)}
          className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-[#8a8f98] transition hover:border-white/[0.15] hover:text-[#e1e3e6] disabled:opacity-50"
          title="Quitar del historial (no afecta a GitHub)"
        >
          Borrar
        </button>
      </div>
    </div>
  )
}
