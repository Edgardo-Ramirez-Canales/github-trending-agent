import { IconX } from './icons.jsx'

// Panel de notificaciones: lista repo, tipo de evento, fecha y enlace al PR/issue.
// Permite marcar como leída individual o todas.
const TIPO_META = {
  pr_aceptado: { txt: 'PR aceptado', cls: 'text-emerald-300' },
  pr_rechazado: { txt: 'PR rechazado', cls: 'text-red-300' },
  issue_respondido: { txt: 'Issue respondido', cls: 'text-sky-300' },
}

export default function NotificationPanel({
  notificaciones,
  onMarcarLeida,
  onMarcarTodas,
  onCerrar,
}) {
  return (
    <div className="absolute right-0 top-12 z-30 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-white/[0.08] bg-[#0e0f11] shadow-2xl shadow-black/40">
      <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-2.5">
        <h3 className="text-sm font-semibold text-[#f7f8f8]">Notificaciones</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMarcarTodas}
            className="text-xs text-[#8a8f98] hover:text-[#e1e3e6]"
          >
            Marcar todas
          </button>
          <button
            type="button"
            onClick={onCerrar}
            className="text-[#8a8f98] transition hover:text-[#e1e3e6]"
            aria-label="Cerrar panel"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-auto">
        {notificaciones.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[#62666d]">
            Sin notificaciones todavía.
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {notificaciones.map((n) => {
              const meta = TIPO_META[n.tipo] || { txt: n.tipo, cls: 'text-[#c4c7cc]' }
              return (
                <li
                  key={n.id}
                  className={
                    'px-4 py-3 text-sm ' + (n.leida ? 'opacity-60' : 'bg-[#007ACC]/8')
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={'text-xs font-semibold ' + meta.cls}>
                      {meta.txt}
                    </span>
                    {!n.leida && (
                      <button
                        type="button"
                        onClick={() => onMarcarLeida(n.id)}
                        className="text-xs text-[#8a8f98] hover:text-[#e1e3e6]"
                      >
                        Marcar leída
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-[#e1e3e6]">{n.mensaje}</p>
                  <div className="mt-1 flex items-center justify-between text-xs text-[#62666d]">
                    <span>{new Date(n.fecha).toLocaleString('es')}</span>
                    {n.url && (
                      <a
                        href={n.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#7cc7ff] hover:underline"
                      >
                        Ver ↗
                      </a>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
