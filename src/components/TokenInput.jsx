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
    <div className="rounded-xl bg-slate-800/60 ring-1 ring-slate-700 p-4">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="gh-token" className="text-sm font-semibold text-slate-200">
          GitHub Token
        </label>
        {tieneToken ? (
          <span
            className={
              'rounded-full px-2.5 py-0.5 text-xs font-medium ' +
              (source === 'oauth'
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-sky-500/15 text-sky-300')
            }
          >
            {source === 'oauth' ? 'desde login OAuth' : 'manual'}
          </span>
        ) : (
          <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-300">
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
          className="min-w-0 flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-100 ring-1 ring-slate-700 placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="rounded-lg bg-slate-700 px-3 text-xs font-medium text-slate-200 hover:bg-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          aria-label={visible ? 'Ocultar token' : 'Mostrar token'}
        >
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
        {tieneToken && (
          <button
            type="button"
            onClick={limpiar}
            className="rounded-lg bg-red-500/15 px-3 text-xs font-medium text-red-300 hover:bg-red-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
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
