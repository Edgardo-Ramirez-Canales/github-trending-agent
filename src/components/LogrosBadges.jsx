// Chips de logros derivados de las contribuciones. Conseguidos en color,
// bloqueados atenuados. Contador de progreso arriba.

export default function LogrosBadges({ logros }) {
  const conseguidos = logros.filter((l) => l.conseguido).length

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-[#e1e3e6]">Logros</h3>
        <span className="text-xs text-[#62666d]">
          {conseguidos}/{logros.length}
        </span>
      </div>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        {logros.map((l) => (
          <li
            key={l.id}
            title={l.desc}
            className={
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition ' +
              (l.conseguido
                ? 'bg-amber-400/15 text-amber-300 ring-amber-400/25'
                : 'bg-white/[0.02] text-[#4a4d54] ring-white/[0.06]')
            }
          >
            <Trofeo activo={l.conseguido} />
            {l.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Trofeo({ activo }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={'h-3 w-3 ' + (activo ? '' : 'opacity-50')}
      aria-hidden="true"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}
