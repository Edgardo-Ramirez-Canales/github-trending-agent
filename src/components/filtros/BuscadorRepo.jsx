import { useState } from 'react'
import { parsearRepoUrl } from '../../services/github.js'
import { getHistorialRepos, agregarHistorialRepo } from '../../utils/storage.js'

// Panel del modo "Buscar repo". Acepta URL completa, github.com/owner/repo o el
// formato corto owner/repo. Valida el formato en cliente ANTES de disparar la
// búsqueda (el error de "no existe / 404" lo reporta el hook sobre la lista).
export default function BuscadorRepo({ urlActiva, onBuscar }) {
  const [texto, setTexto] = useState(urlActiva || '')
  const [errorLocal, setErrorLocal] = useState('')
  const [historial, setHistorial] = useState(getHistorialRepos)

  function buscar(valor) {
    const entrada = (valor ?? texto).trim()
    if (!entrada) return
    const parsed = parsearRepoUrl(entrada)
    if (!parsed) {
      setErrorLocal('Formato inválido. Usá owner/repo o github.com/owner/repo')
      return
    }
    setErrorLocal('')
    const nombre = `${parsed.owner}/${parsed.repo}`
    setTexto(nombre)
    setHistorial(agregarHistorialRepo(nombre))
    onBuscar(entrada)
  }

  return (
    <div className="mt-4 grid gap-3 rounded-lg border border-white/[0.08] bg-[#0e0f11] p-4 shadow-2xl shadow-black/20">
      <div className="flex flex-wrap items-end gap-2">
        <label htmlFor="urlrepo" className="flex-1 text-xs font-medium text-[#8a8f98]">
          URL o nombre del repo
          <input
            id="urlrepo"
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscar()}
            placeholder="ej: facebook/react o https://github.com/facebook/react"
            className="mt-1 w-full rounded-md border border-white/[0.08] bg-[#0a0b0d] px-3 py-2 text-sm text-[#f7f8f8] placeholder:text-[#4a4d54] outline-none transition focus:border-[#007ACC]/70 focus:ring-2 focus:ring-[#007ACC]/25"
          />
        </label>
        <button
          type="button"
          onClick={() => buscar()}
          className="rounded-md border border-[#007ACC]/50 bg-[#007ACC]/15 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-[#007ACC]/25"
        >
          Buscar
        </button>
      </div>

      {errorLocal && <p className="text-xs text-red-300">{errorLocal}</p>}

      {historial.length > 0 && (
        <div>
          <span className="text-xs font-medium text-[#8a8f98]">Recientes</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {historial.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => buscar(n)}
                className="rounded-md bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-[#c4c7cc] ring-1 ring-white/[0.08] transition hover:bg-white/[0.07]"
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
