// Pantalla de login. Sin sesión, la app no muestra nada más (ruta protegida).
// Login con GitHub OAuth: un click, obtiene el token de GitHub automáticamente.
export default function LoginScreen({ onLogin, error, cargando }) {
  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-slate-800/60 ring-1 ring-slate-700 p-8 text-center shadow-xl">
        <h1 className="text-2xl font-bold text-slate-100">GitHub Trending Agent</h1>
        <p className="mt-3 text-sm text-slate-400">
          Detecta repos en crecimiento explosivo, analízalos con IA y crea
          oportunidades de valor — con control total en cada paso.
        </p>

        <button
          type="button"
          onClick={onLogin}
          disabled={cargando}
          className="mt-8 w-full inline-flex items-center justify-center gap-3 rounded-xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.21 3.44 9.63 8.21 11.19.6.11.82-.25.82-.56 0-.28-.01-1.02-.02-2-3.34.71-4.04-1.58-4.04-1.58-.55-1.36-1.34-1.72-1.34-1.72-1.09-.73.08-.72.08-.72 1.2.08 1.84 1.21 1.84 1.21 1.07 1.79 2.81 1.27 3.5.97.11-.76.42-1.27.76-1.56-2.67-.3-5.47-1.3-5.47-5.79 0-1.28.47-2.33 1.24-3.15-.13-.3-.54-1.5.12-3.12 0 0 1.01-.32 3.3 1.2.96-.26 1.98-.39 3-.4 1.02.01 2.04.14 3 .4 2.29-1.52 3.3-1.2 3.3-1.2.66 1.62.25 2.82.12 3.12.77.82 1.24 1.87 1.24 3.15 0 4.5-2.81 5.49-5.49 5.78.43.36.81 1.09.81 2.2 0 1.59-.01 2.87-.01 3.26 0 .31.22.68.83.56C20.56 21.91 24 17.5 24 12.29 24 5.78 18.63.5 12 .5Z" />
          </svg>
          {cargando ? 'Conectando…' : 'Continuar con GitHub'}
        </button>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-400">
            {error}
          </p>
        )}

        <p className="mt-6 text-xs text-slate-500">
          Pedimos permiso <code className="text-slate-400">public_repo</code> para
          poder hacer fork, commit y PR en repos públicos en tu nombre.
        </p>
      </div>
    </div>
  )
}
