// Badge con contador de notificaciones no leídas. Visible desde cualquier vista.
export default function NotificationBadge({ count = 0, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative rounded-lg bg-slate-800 p-2 text-slate-200 ring-1 ring-slate-700 hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
      aria-label={`Notificaciones${count ? `, ${count} sin leer` : ''}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}
