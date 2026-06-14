import { useState } from 'react'
import {
  getOpenAIKey,
  setOpenAIKey,
  getGeminiKey,
  setGeminiKey,
  getActiveProvider,
  setActiveProvider,
} from '../utils/storage.js'

// Selector dual de proveedor de IA: OpenAI ↔ Gemini.
// Ambas claves se guardan en paralelo (localStorage). Si solo hay una, queda
// activa por defecto. El usuario cambia de proveedor sin perder configuración.
export default function AIProviderSelector({ onChange }) {
  const [openaiKey, setOpenai] = useState(getOpenAIKey())
  const [geminiKey, setGemini] = useState(getGeminiKey())
  const [provider, setProvider] = useState(getActiveProvider())
  const [verOpenai, setVerOpenai] = useState(false)
  const [verGemini, setVerGemini] = useState(false)

  const tieneOpenai = Boolean(openaiKey)
  const tieneGemini = Boolean(geminiKey)

  function actualizarOpenai(valor) {
    setOpenai(valor)
    setOpenAIKey(valor)
    sincronizarProveedor(valor, geminiKey)
  }

  function actualizarGemini(valor) {
    setGemini(valor)
    setGeminiKey(valor)
    sincronizarProveedor(openaiKey, valor)
  }

  // Si al cambiar claves el proveedor activo se queda sin clave, salta al otro.
  function sincronizarProveedor(oa, gm) {
    let activo = provider
    if (activo === 'openai' && !oa && gm) activo = 'gemini'
    if (activo === 'gemini' && !gm && oa) activo = 'openai'
    if (activo !== provider) elegir(activo)
    else onChange?.({ provider: activo, openaiKey: oa, geminiKey: gm })
  }

  function elegir(p) {
    setProvider(p)
    setActiveProvider(p)
    onChange?.({ provider: p, openaiKey, geminiKey })
  }

  const nombreActivo = provider === 'openai' ? 'OpenAI' : 'Gemini'
  const activoTieneClave = provider === 'openai' ? tieneOpenai : tieneGemini

  return (
    <div className="rounded-lg border border-white/10 bg-[#0d111a]/78 p-4 shadow-xl shadow-black/10">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-200">Proveedor de IA</h3>
        <span
          className={
            'rounded-full px-2.5 py-0.5 text-xs font-medium ' +
            (activoTieneClave
              ? 'bg-[#007ACC]/15 text-[#7cc7ff] ring-1 ring-[#007ACC]/30'
              : 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/25')
          }
        >
          {activoTieneClave ? `Usando: ${nombreActivo}` : 'Sin clave configurada'}
        </span>
      </div>

      {/* Toggle de proveedor */}
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-md border border-white/10 bg-[#080b12] p-1">
        <ProviderToggle
          activo={provider === 'openai'}
          disponible={tieneOpenai}
          onClick={() => elegir('openai')}
          label="OpenAI"
        />
        <ProviderToggle
          activo={provider === 'gemini'}
          disponible={tieneGemini}
          onClick={() => elegir('gemini')}
          label="Gemini"
        />
      </div>

      {/* Claves */}
      <div className="mt-3 space-y-3">
        <KeyField
          id="openai-key"
          label="Clave OpenAI"
          value={openaiKey}
          visible={verOpenai}
          onToggle={() => setVerOpenai((v) => !v)}
          onChange={actualizarOpenai}
          placeholder="sk-…"
        />
        <KeyField
          id="gemini-key"
          label="Clave Gemini"
          value={geminiKey}
          visible={verGemini}
          onToggle={() => setVerGemini((v) => !v)}
          onChange={actualizarGemini}
          placeholder="AIza… / AQ.…"
        />
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Llena la(s) que tengas. Ambas se guardan en localStorage; el análisis usa
        el proveedor activo. Puedes cambiar en cualquier momento.
      </p>
    </div>
  )
}

function ProviderToggle({ activo, disponible, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'relative rounded px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007ACC] ' +
        (activo
          ? 'bg-[#007ACC]/18 text-[#d7efff] ring-1 ring-[#007ACC]/45'
          : 'text-slate-400 hover:text-slate-200')
      }
    >
      {label}
      <span
        className={
          'ml-2 inline-block h-1.5 w-1.5 rounded-full align-middle ' +
          (disponible ? 'bg-emerald-400' : 'bg-slate-600')
        }
        title={disponible ? 'Clave configurada' : 'Sin clave'}
      />
    </button>
  )
}

function KeyField({ id, label, value, visible, onToggle, onChange, placeholder }) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-slate-400">
        {label}
      </label>
      <div className="mt-1 flex items-stretch gap-2">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-md border border-white/10 bg-[#080b12] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-[#007ACC]/70 focus:ring-2 focus:ring-[#007ACC]/25"
        />
        <button
          type="button"
          onClick={onToggle}
          className="rounded-md border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-slate-200 transition hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007ACC]"
          aria-label={visible ? `Ocultar ${label}` : `Mostrar ${label}`}
        >
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
    </div>
  )
}
