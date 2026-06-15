import { useState } from 'react'
import {
  getAIKey,
  setAIKey,
  getAIModel,
  setAIModel,
  getActiveProvider,
  setActiveProvider,
} from '../utils/storage.js'
import { PROVEEDORES, IDS_PROVEEDORES } from '../services/ai/registry.js'

// Selector de proveedor de IA en formato acordeón (lista). Escala a N proveedores
// definidos en services/ai/registry.js: cada fila muestra estado + radio para
// activar + expandir para configurar clave y modelo. Todo persiste en localStorage;
// agregar un proveedor nuevo NO requiere tocar este componente.
function inicial(getter) {
  return Object.fromEntries(IDS_PROVEEDORES.map((id) => [id, getter(id)]))
}

export default function AIProviderSelector({ onChange }) {
  const [claves, setClaves] = useState(() => inicial(getAIKey))
  const [modelos, setModelos] = useState(() => inicial(getAIModel))
  const [provider, setProvider] = useState(getActiveProvider())
  const [expandido, setExpandido] = useState(provider)
  const [visibles, setVisibles] = useState({})

  function emitir(next = {}) {
    const estado = { provider, claves, modelos, ...next }
    onChange?.(estado)
  }

  function actualizarClave(id, valor) {
    const nuevasClaves = { ...claves, [id]: valor }
    setClaves(nuevasClaves)
    setAIKey(id, valor)

    // Si el proveedor activo se quedó sin clave, salta al primero que tenga una.
    let activo = provider
    if (id === provider && !valor) {
      const conClave = IDS_PROVEEDORES.find((p) => Boolean(nuevasClaves[p]))
      if (conClave) {
        activo = conClave
        setProvider(conClave)
        setActiveProvider(conClave)
      }
    }
    emitir({ provider: activo, claves: nuevasClaves })
  }

  function actualizarModelo(id, valor) {
    const nuevos = { ...modelos, [id]: valor }
    setModelos(nuevos)
    setAIModel(id, valor)
    emitir({ modelos: nuevos })
  }

  function elegir(id) {
    setProvider(id)
    setActiveProvider(id)
    emitir({ provider: id })
  }

  function toggleExpandir(id) {
    setExpandido((prev) => (prev === id ? null : id))
  }

  function toggleVisible(id) {
    setVisibles((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const activo = PROVEEDORES.find((p) => p.id === provider)
  const activoTieneClave = Boolean(claves[provider])

  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#0e0f11] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_1px_2px_0_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[#e1e3e6]">Proveedor de IA</h3>
        <span
          className={
            'rounded-full px-2.5 py-0.5 text-xs font-medium ' +
            (activoTieneClave
              ? 'bg-[#007ACC]/15 text-[#7cc7ff] ring-1 ring-[#007ACC]/30'
              : 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/25')
          }
        >
          {activoTieneClave
            ? `Usando: ${activo?.nombre ?? provider}`
            : 'Sin clave configurada'}
        </span>
      </div>

      {/* Lista de proveedores (acordeón) */}
      <div className="mt-3 divide-y divide-white/[0.06] overflow-hidden rounded-md border border-white/[0.08] bg-[#0a0b0d]">
        {PROVEEDORES.map((p) => (
          <ProviderRow
            key={p.id}
            proveedor={p}
            activo={p.id === provider}
            tieneClave={Boolean(claves[p.id])}
            expandido={expandido === p.id}
            clave={claves[p.id] || ''}
            modelo={modelos[p.id] || p.modeloDefault}
            claveVisible={Boolean(visibles[p.id])}
            onActivar={() => elegir(p.id)}
            onToggleExpandir={() => toggleExpandir(p.id)}
            onToggleVisible={() => toggleVisible(p.id)}
            onClaveChange={(v) => actualizarClave(p.id, v)}
            onModeloChange={(v) => actualizarModelo(p.id, v)}
          />
        ))}
      </div>

      <p className="mt-3 text-xs text-[#62666d]">
        Configura la(s) que tengas. Las claves se guardan en localStorage; el
        análisis usa el proveedor activo (●). Puedes cambiar en cualquier momento.
      </p>
    </div>
  )
}

function ProviderRow({
  proveedor,
  activo,
  tieneClave,
  expandido,
  clave,
  modelo,
  claveVisible,
  onActivar,
  onToggleExpandir,
  onToggleVisible,
  onClaveChange,
  onModeloChange,
}) {
  const { id, nombre, placeholder, docsUrl, color, modelos } = proveedor

  return (
    <div className={activo ? 'bg-white/[0.02]' : ''}>
      {/* Cabecera de la fila */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Radio para activar */}
        <button
          type="button"
          onClick={onActivar}
          role="radio"
          aria-checked={activo}
          aria-label={`Activar ${nombre}`}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007ACC]"
          style={{
            borderColor: activo ? color : 'rgba(255,255,255,0.18)',
          }}
        >
          {activo && (
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
          )}
        </button>

        {/* Nombre + estado → expandir */}
        <button
          type="button"
          onClick={onToggleExpandir}
          aria-expanded={expandido}
          className="flex min-w-0 flex-1 items-center gap-2 text-left focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[#007ACC]"
        >
          <span className="truncate text-sm font-medium text-[#e1e3e6]">
            {nombre}
          </span>
          <StatusPill activo={activo} tieneClave={tieneClave} />
          <svg
            className={
              'ml-auto h-4 w-4 shrink-0 text-[#62666d] transition-transform ' +
              (expandido ? 'rotate-180' : '')
            }
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Cuerpo expandible: clave + modelo + docs */}
      {expandido && (
        <div className="space-y-3 px-3 pb-3 pl-10">
          <KeyField
            id={`aikey-${id}`}
            label={`Clave ${nombre}`}
            value={clave}
            visible={claveVisible}
            onToggle={onToggleVisible}
            onChange={onClaveChange}
            placeholder={placeholder}
          />

          <div>
            <label
              htmlFor={`aimodel-${id}`}
              className="text-xs font-medium text-[#8a8f98]"
            >
              Modelo
            </label>
            <select
              id={`aimodel-${id}`}
              value={modelo}
              onChange={(e) => onModeloChange(e.target.value)}
              className="mt-1 w-full rounded-md border border-white/[0.08] bg-[#0a0b0d] px-3 py-2 text-sm text-[#f7f8f8] outline-none transition focus:border-[#007ACC]/70 focus:ring-2 focus:ring-[#007ACC]/25"
            >
              {modelos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.etiqueta}
                </option>
              ))}
            </select>
          </div>

          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-[#7cc7ff] hover:underline"
          >
            Obtener clave de {nombre}
            <svg
              className="h-3 w-3"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
            </svg>
          </a>
        </div>
      )}
    </div>
  )
}

function StatusPill({ activo, tieneClave }) {
  if (activo) {
    return (
      <span className="rounded-full bg-[#007ACC]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#7cc7ff] ring-1 ring-[#007ACC]/30">
        Activo
      </span>
    )
  }
  return (
    <span
      className={
        'inline-flex items-center gap-1 text-xs font-medium ' +
        (tieneClave ? 'text-emerald-400' : 'text-[#62666d]')
      }
    >
      <span
        className={
          'inline-block h-1.5 w-1.5 rounded-full ' +
          (tieneClave ? 'bg-emerald-400' : 'bg-slate-600')
        }
      />
      {tieneClave ? 'Clave lista' : 'Sin clave'}
    </span>
  )
}

function KeyField({ id, label, value, visible, onToggle, onChange, placeholder }) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-[#8a8f98]">
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
          className="min-w-0 flex-1 rounded-md border border-white/[0.08] bg-[#0a0b0d] px-3 py-2 text-sm text-[#f7f8f8] placeholder:text-[#4a4d54] outline-none transition focus:border-[#007ACC]/70 focus:ring-2 focus:ring-[#007ACC]/25"
        />
        <button
          type="button"
          onClick={onToggle}
          className="rounded-md border border-white/[0.08] bg-white/[0.04] px-3 text-xs font-medium text-[#e1e3e6] transition hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007ACC]"
          aria-label={visible ? `Ocultar ${label}` : `Mostrar ${label}`}
        >
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
    </div>
  )
}
