import { useState } from 'react'
import {
  getGithubToken,
  getGithubTokenSource,
  setGithubToken,
  clearGithubToken,
} from '../utils/storage.js'

// Input del GitHub Token. Normalmente ya viene del login OAuth (source 'oauth');
// el usuario puede sobreescribirlo manualmente (override) o borrarlo.
// Sin token, la app funciona en modo limitado (60 req/h).
export default function TokenInput({ onChange }) {
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
    <div className="rounded-lg border border-white/10 bg-[#0d111a]/78 p-4 shadow-xl shadow-black/10">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="gh-token" className="text-sm font-semibold text-slate-200">
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
          className="min-w-0 flex-1 rounded-md border border-white/10 bg-[#080b12] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-[#007ACC]/70 focus:ring-2 focus:ring-[#007ACC]/25"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="rounded-md border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-slate-200 transition hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007ACC]"
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

      <p className="mt-2 text-xs text-slate-500">
        Se guarda solo en este navegador (localStorage). Nunca se envía a Supabase
        ni al servidor.
      </p>
    </div>
  )
}
