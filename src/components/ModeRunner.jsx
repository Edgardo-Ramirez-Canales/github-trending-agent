import { useState } from 'react'
import { META_POR_CLAVE, getContenidoGenerado } from '../utils/categorias.js'
import { crearIssue } from '../services/github.js'
import { registrarContribucion } from '../services/supabase.js'
import ExecutionQueue from './ExecutionQueue.jsx'

// Ejecuta el modo elegido sobre las categorías seleccionadas.
//   A → borrador de texto copiable (no toca GitHub)
//   B → abre issue real en el repo (con aprobación por categoría)
//   C → agente completo (se implementa en ExecutionQueue, siguiente bloque)
export default function ModeRunner({ repo, analisis, seleccionadas, modo }) {
  if (!seleccionadas.length || !modo) return null

  if (modo === 'A') {
    return <ModoA repo={repo} analisis={analisis} seleccionadas={seleccionadas} />
  }
  if (modo === 'B') {
    return <ModoB repo={repo} analisis={analisis} seleccionadas={seleccionadas} />
  }
  return (
    <ExecutionQueue repo={repo} analisis={analisis} seleccionadas={seleccionadas} />
  )
}

// ----------------------------------------------------------------------------
// Modo A — Solo texto
// ----------------------------------------------------------------------------
function ModoA({ analisis, seleccionadas }) {
  return (
    <div className="mt-5 space-y-3">
      <h4 className="text-sm font-semibold text-slate-200">
        Modo A — Borradores generados
      </h4>
      {seleccionadas.map((clave) => {
        const meta = META_POR_CLAVE[clave]
        const datos = analisis[clave] || {}
        const contenido = getContenidoGenerado(clave, datos)
        const texto = construirTextoA(meta, datos, contenido)
        return (
          <div
            key={clave}
            className="rounded-xl bg-slate-800/60 p-4 ring-1 ring-slate-700"
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={'rounded-full px-2.5 py-0.5 text-xs font-semibold ' + meta.chip}
              >
                {meta.label}
              </span>
              <CopiarBtn texto={texto} />
            </div>
            {datos.resumen && (
              <p className="mt-2 text-sm text-slate-400">{datos.resumen}</p>
            )}
            {contenido && (
              <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-300 ring-1 ring-slate-800">
                <code>{contenido}</code>
              </pre>
            )}
          </div>
        )
      })}
    </div>
  )
}

function construirTextoA(meta, datos, contenido) {
  const lineas = [`## ${meta.label}`, '']
  if (datos.resumen) lineas.push(datos.resumen, '')
  if (datos.feature_principal)
    lineas.push(`Feature principal: ${datos.feature_principal}`, '')
  if (datos.principio_violado)
    lineas.push(`Principio SOLID violado: ${datos.principio_violado}`, '')
  if (datos.explicacion_cambios) lineas.push(datos.explicacion_cambios, '')
  if (contenido) lineas.push('```', contenido, '```')
  return lineas.join('\n')
}

// ----------------------------------------------------------------------------
// Modo B — Propuesta al dueño (issue real)
// ----------------------------------------------------------------------------
function ModoB({ repo, analisis, seleccionadas }) {
  const [estados, setEstados] = useState({}) // clave → { estado, url, error }

  async function abrir(clave) {
    const meta = META_POR_CLAVE[clave]
    const datos = analisis[clave] || {}
    const { titulo, cuerpo } = construirIssue(meta, datos, repo)

    setEstados((p) => ({ ...p, [clave]: { estado: 'abriendo' } }))
    try {
      const issue = await crearIssue(repo.owner, repo.repo, { titulo, cuerpo })
      // Registra la contribución (no bloquea si Supabase falla).
      try {
        await registrarContribucion({
          repo: repo.nombre,
          tipo_cambio: meta.tipoCambio,
          modo: 'B',
          url_issue: issue.html_url,
          categorias: [clave],
        })
      } catch {
        /* registro best-effort */
      }
      setEstados((p) => ({
        ...p,
        [clave]: { estado: 'abierto', url: issue.html_url },
      }))
    } catch (e) {
      setEstados((p) => ({
        ...p,
        [clave]: { estado: 'error', error: e.message },
      }))
    }
  }

  return (
    <div className="mt-5 space-y-3">
      <h4 className="text-sm font-semibold text-slate-200">
        Modo B — Issues a publicar
      </h4>
      <p className="text-xs text-slate-500">
        Cada issue se abre en <code className="text-slate-400">{repo.nombre}</code>{' '}
        solo cuando tú lo apruebas.
      </p>
      {seleccionadas.map((clave) => {
        const meta = META_POR_CLAVE[clave]
        const datos = analisis[clave] || {}
        const { titulo, cuerpo } = construirIssue(meta, datos, repo)
        const st = estados[clave] || {}
        return (
          <IssuePreview
            key={clave}
            meta={meta}
            titulo={titulo}
            cuerpo={cuerpo}
            estado={st}
            onAbrir={() => abrir(clave)}
          />
        )
      })}
    </div>
  )
}

function IssuePreview({ meta, titulo, cuerpo, estado, onAbrir }) {
  const [verCuerpo, setVerCuerpo] = useState(false)
  const abierto = estado.estado === 'abierto'
  const abriendo = estado.estado === 'abriendo'

  return (
    <div className="rounded-xl bg-slate-800/60 p-4 ring-1 ring-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={'rounded-full px-2.5 py-0.5 text-xs font-semibold ' + meta.chip}
        >
          {meta.label}
        </span>
        {abierto ? (
          <a
            href={estado.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-200 ring-1 ring-emerald-500/40 hover:bg-emerald-500/30"
          >
            ✓ Issue abierto — ver
          </a>
        ) : (
          <button
            type="button"
            onClick={onAbrir}
            disabled={abriendo}
            className="rounded-lg bg-sky-500/20 px-3 py-1 text-xs font-medium text-sky-200 ring-1 ring-sky-500/40 hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {abriendo ? 'Abriendo…' : 'Aprobar y abrir issue'}
          </button>
        )}
      </div>

      <p className="mt-2 text-sm font-medium text-slate-200">{titulo}</p>
      <button
        type="button"
        onClick={() => setVerCuerpo((v) => !v)}
        className="mt-1 text-xs text-slate-400 hover:text-slate-200 hover:underline"
      >
        {verCuerpo ? 'Ocultar cuerpo' : 'Ver cuerpo del issue'}
      </button>
      {verCuerpo && (
        <pre className="mt-2 max-h-60 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-300 ring-1 ring-slate-800 whitespace-pre-wrap">
          {cuerpo}
        </pre>
      )}
      {estado.estado === 'error' && (
        <p className="mt-2 text-xs text-red-400">{estado.error}</p>
      )}
    </div>
  )
}

function construirIssue(meta, datos, repo) {
  const titulo =
    `[${meta.tipoCambio}] ` +
    (datos.feature_principal ||
      datos.principio_violado ||
      `Propuesta de mejora — ${meta.label}`)

  const partes = [
    `### Oportunidad detectada: ${meta.label}`,
    '',
    datos.resumen || '',
    '',
  ]
  if (Array.isArray(datos.secciones_faltantes) && datos.secciones_faltantes.length)
    partes.push(`**Secciones faltantes:** ${datos.secciones_faltantes.join(', ')}`, '')
  if (datos.angulo_unico) partes.push(`**Ángulo único:** ${datos.angulo_unico}`, '')
  if (Array.isArray(datos.competidores) && datos.competidores.length)
    partes.push(`**Competidores:** ${datos.competidores.join(', ')}`, '')
  if (datos.explicacion_cambios) partes.push(datos.explicacion_cambios, '')

  partes.push(
    '',
    '---',
    `_Análisis generado automáticamente para ${repo.nombre} con GitHub Trending Agent._`,
  )
  return { titulo, cuerpo: partes.filter((l) => l !== undefined).join('\n') }
}

// ----------------------------------------------------------------------------
function CopiarBtn({ texto }) {
  const [copiado, setCopiado] = useState(false)
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      /* sin permiso de clipboard */
    }
  }
  return (
    <button
      type="button"
      onClick={copiar}
      className="rounded-lg bg-slate-700 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-600"
    >
      {copiado ? '✓ Copiado' : 'Copiar'}
    </button>
  )
}
