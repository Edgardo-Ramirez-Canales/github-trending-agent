import { useState, useRef, useMemo } from 'react'
import {
  getRepo,
  forkRepo,
  getRefSha,
  crearRama,
  getContenidoArchivo,
  commitArchivo,
  crearPR,
  cerrarPR,
} from '../services/github.js'
import {
  registrarContribucion,
  actualizarEstadoContribucion,
} from '../services/supabase.js'
import {
  META_POR_CLAVE,
  getArchivoSugerido,
  getContenidoGenerado,
  getNombreRama,
} from '../utils/categorias.js'
import { detectarImpactoImports } from '../utils/diff.js'
import DiffViewer from './DiffViewer.jsx'
import { IconCheck, IconPencil, IconSkip, IconX } from './icons.jsx'

// Orden de ejecución por riesgo: de menor a mayor (Docs → Mercado → Features → Código).
const ORDEN_RIESGO = [
  'docs_readme',
  'gap_mercado',
  'features_faltantes',
  'codigo_solid',
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Modo C completo: resumen consolidado → fork → rama → diff/aprobación por
// categoría → commit → PR, con "Cancelar todo" siempre visible y rollback.
export default function ExecutionQueue({ repo, analisis, seleccionadas, onContribCreada }) {
  const [fase, setFase] = useState('resumen') // resumen | ejecutando | finalizado | cancelado
  const [prMode, setPrMode] = useState('separados') // separados | unico
  const [idx, setIdx] = useState(0)
  const [items, setItems] = useState({}) // clave → { estado, archivo, rama, sha, original, nuevo, advertencia, prUrl, error }
  const [prsAbiertos, setPrsAbiertos] = useState([])
  const [editando, setEditando] = useState(false)
  const [valorEditado, setValorEditado] = useState('')
  const [progreso, setProgreso] = useState(null)
  const [errorGlobal, setErrorGlobal] = useState(null)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [rollback, setRollback] = useState(null) // null | { seleccion: Set }

  const ctx = useRef({}) // { forkOwner, forkRepo, defaultBranch, baseSha, ramaUnica }
  const ordenRef = useRef([])
  const committedRef = useRef([])

  // Orden previsto (para el resumen), respetando el orden de riesgo.
  const ordenPreview = useMemo(
    () => ORDEN_RIESGO.filter((c) => seleccionadas.includes(c)),
    [seleccionadas],
  )

  function setItem(clave, patch) {
    setItems((prev) => ({ ...prev, [clave]: { ...prev[clave], ...patch } }))
  }

  // -------------------------------------------------------------------------
  // Fase 1 → 2: confirmar y ejecutar (fork + rama base)
  // -------------------------------------------------------------------------
  async function confirmarEjecutar() {
    setErrorGlobal(null)
    setFase('ejecutando')
    setProgreso('Creando fork del repo…')
    ordenRef.current = ordenPreview
    committedRef.current = []
    try {
      const original = await getRepo(repo.owner, repo.repo)
      const defaultBranch = original.default_branch
      const fork = await forkRepo(repo.owner, repo.repo)
      const forkOwner = fork.owner.login
      const forkRepoName = fork.name

      // El fork es asíncrono: esperar a que la rama base esté disponible.
      let baseSha = null
      for (let intento = 0; intento < 6; intento++) {
        try {
          baseSha = await getRefSha(forkOwner, forkRepoName, defaultBranch)
          break
        } catch {
          await sleep(2000)
        }
      }
      if (!baseSha)
        throw new Error('El fork tardó demasiado en estar listo. Reintenta.')

      ctx.current = { forkOwner, forkRepo: forkRepoName, defaultBranch, baseSha }

      // PR único: una sola rama para todos los cambios.
      if (prMode === 'unico') {
        const ramaUnica = 'agente/mejoras-' + Date.now().toString(36)
        await crearRama(forkOwner, forkRepoName, ramaUnica, baseSha)
        ctx.current.ramaUnica = ramaUnica
      }

      setProgreso(null)
      await prepararCategoria(0)
    } catch (e) {
      setErrorGlobal(e.message)
      setProgreso(null)
      setFase('resumen')
    }
  }

  // -------------------------------------------------------------------------
  // Preparar el diff de una categoría (crea rama si es PR separado)
  // -------------------------------------------------------------------------
  async function prepararCategoria(i) {
    const clave = ordenRef.current[i]
    setIdx(i)
    setItem(clave, { estado: 'preparando' })
    try {
      const datos = analisis[clave] || {}
      const archivo = getArchivoSugerido(clave, datos)
      const nuevo = getContenidoGenerado(clave, datos)
      const { forkOwner, forkRepo, baseSha, ramaUnica } = ctx.current

      let rama
      if (prMode === 'unico') {
        rama = ramaUnica
      } else {
        rama = getNombreRama(clave, datos)
        try {
          await crearRama(forkOwner, forkRepo, rama, baseSha)
        } catch (e) {
          if (e.status !== 422) throw e // 422 = la rama ya existe (reintento)
        }
      }

      const actual = await getContenidoArchivo(forkOwner, forkRepo, archivo, rama)
      const advertencia = detectarImpactoImports(archivo, nuevo)

      setItem(clave, {
        estado: 'diff',
        archivo,
        rama,
        sha: actual.sha,
        original: actual.contenido,
        nuevo,
        advertencia,
      })
      setValorEditado(nuevo)
      setEditando(false)
    } catch (e) {
      setItem(clave, { estado: 'error', error: e.message })
    }
  }

  // -------------------------------------------------------------------------
  // Botones de aprobación
  // -------------------------------------------------------------------------
  async function aprobar(i, contenidoFinal) {
    const clave = ordenRef.current[i]
    const item = items[clave]
    const meta = META_POR_CLAVE[clave]
    const datos = analisis[clave] || {}
    setItem(clave, { estado: 'commiteando' })
    try {
      const { forkOwner, forkRepo, defaultBranch } = ctx.current
      await commitArchivo(forkOwner, forkRepo, {
        path: item.archivo,
        contenido: contenidoFinal,
        mensaje: construirMensajeCommit(meta, datos),
        rama: item.rama,
        sha: item.sha,
      })
      committedRef.current.push(clave)

      if (prMode === 'separados') {
        const { titulo, cuerpo } = construirPR([clave], analisis, repo)
        const pr = await crearPR(repo.owner, repo.repo, {
          titulo,
          cuerpo,
          head: `${forkOwner}:${item.rama}`,
          base: defaultBranch,
        })
        const contrib = await registrarContribucion({
          repo: repo.nombre,
          rama: item.rama,
          tipo_cambio: meta.tipoCambio,
          modo: 'C',
          url_pr: pr.html_url,
          categorias: [clave],
        }).catch(() => null)
        // Refresca badge + panel de contribuciones sin recargar la página.
        await onContribCreada?.()
        setItem(clave, { estado: 'pr-abierto', prUrl: pr.html_url })
        setPrsAbiertos((p) => [
          ...p,
          {
            clave,
            owner: repo.owner,
            repo: repo.repo,
            numero: pr.number,
            url: pr.html_url,
            contribId: contrib?.id,
          },
        ])
      } else {
        setItem(clave, { estado: 'commiteado' })
      }
      avanzar(i)
    } catch (e) {
      setItem(clave, { estado: 'error', error: e.message })
    }
  }

  function saltar(i) {
    const clave = ordenRef.current[i]
    setItem(clave, { estado: 'saltado' })
    avanzar(i)
  }

  function avanzar(i) {
    const next = i + 1
    if (next < ordenRef.current.length) prepararCategoria(next)
    else finalizar()
  }

  async function finalizar() {
    const committed = committedRef.current
    // PR único: abrir un solo PR al final con todos los cambios commiteados.
    if (prMode === 'unico' && committed.length) {
      setProgreso('Abriendo PR único…')
      try {
        const { forkOwner, defaultBranch, ramaUnica } = ctx.current
        const { titulo, cuerpo } = construirPR(committed, analisis, repo)
        const pr = await crearPR(repo.owner, repo.repo, {
          titulo,
          cuerpo,
          head: `${forkOwner}:${ramaUnica}`,
          base: defaultBranch,
        })
        const contrib = await registrarContribucion({
          repo: repo.nombre,
          rama: ramaUnica,
          tipo_cambio: committed.map((c) => META_POR_CLAVE[c].tipoCambio).join('+'),
          modo: 'C',
          url_pr: pr.html_url,
          categorias: committed,
        }).catch(() => null)
        // Refresca badge + panel de contribuciones sin recargar la página.
        await onContribCreada?.()
        setPrsAbiertos((p) => [
          ...p,
          {
            clave: 'unico',
            owner: repo.owner,
            repo: repo.repo,
            numero: pr.number,
            url: pr.html_url,
            contribId: contrib?.id,
          },
        ])
      } catch (e) {
        setErrorGlobal('No se pudo abrir el PR único: ' + e.message)
      }
      setProgreso(null)
    }
    setFase('finalizado')
  }

  // -------------------------------------------------------------------------
  // Cancelar todo (doble confirmación) + rollback
  // -------------------------------------------------------------------------
  function clicCancelar() {
    if (!cancelConfirm) {
      setCancelConfirm(true)
      setTimeout(() => setCancelConfirm(false), 4000)
      return
    }
    setCancelConfirm(false)
    if (prsAbiertos.length > 0) {
      setRollback({ seleccion: new Set(prsAbiertos.map((p) => p.numero)) })
    } else {
      setFase('cancelado')
    }
  }

  async function ejecutarRollback(cerrar) {
    if (cerrar && rollback) {
      setProgreso('Cerrando PRs…')
      for (const pr of prsAbiertos) {
        if (!rollback.seleccion.has(pr.numero)) continue
        try {
          await cerrarPR(pr.owner, pr.repo, pr.numero)
          if (pr.contribId)
            await actualizarEstadoContribucion(pr.contribId, 'cancelado').catch(
              () => {},
            )
        } catch {
          /* best-effort: continuar cerrando los demás */
        }
      }
      setProgreso(null)
    }
    setRollback(null)
    setFase('cancelado')
  }

  // =========================================================================
  // Render
  // =========================================================================
  if (!seleccionadas.length) return null

  return (
    <div className="mt-5 rounded-lg border border-[#007ACC]/30 bg-[#0e0f11] p-4 shadow-2xl shadow-black/20">
      <h4 className="text-sm font-semibold text-[#d7efff]">
        Modo C — Agente completo
      </h4>

      {errorGlobal && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {errorGlobal}
        </div>
      )}

      {/* FASE 1 — Resumen consolidado */}
      {fase === 'resumen' && (
        <ResumenConsolidado
          orden={ordenPreview}
          analisis={analisis}
          prMode={prMode}
          setPrMode={setPrMode}
          onConfirmar={confirmarEjecutar}
        />
      )}

      {/* FASE 2 — Ejecución */}
      {fase === 'ejecutando' && (
        <div className="mt-4">
          {/* Cancelar todo — siempre visible, rojo, doble confirmación */}
          <div className="sticky top-16 z-10 mb-4 flex items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-[#0a0b0d]/95 p-2 shadow-xl shadow-black/25">
            <span className="text-xs text-[#8a8f98]">
              {progreso || `Categoría ${idx + 1} de ${ordenRef.current.length}`}
            </span>
            <button
              type="button"
              onClick={clicCancelar}
              className={
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold text-white transition ' +
                (cancelConfirm
                  ? 'animate-pulse bg-red-600 hover:bg-red-700'
                  : 'bg-red-500 hover:bg-red-600')
              }
            >
              <IconX className="h-4 w-4" />
              {cancelConfirm ? '¿Seguro? Confirmar cancelar todo' : 'Cancelar todo'}
            </button>
          </div>

          {/* Rollback */}
          {rollback && (
            <RollbackPanel
              prs={prsAbiertos}
              seleccion={rollback.seleccion}
              onToggle={(numero) =>
                setRollback((r) => {
                  const s = new Set(r.seleccion)
                  s.has(numero) ? s.delete(numero) : s.add(numero)
                  return { seleccion: s }
                })
              }
              onCerrar={() => ejecutarRollback(true)}
              onDejar={() => ejecutarRollback(false)}
            />
          )}

          {/* Lista de categorías + diff de la actual */}
          {!rollback && (
            <ol className="space-y-3">
              {ordenRef.current.map((clave, i) => (
                <CategoriaEjecucion
                  key={clave}
                  clave={clave}
                  item={items[clave] || {}}
                  activa={i === idx}
                  editando={editando && i === idx}
                  valorEditado={valorEditado}
                  onCambioTexto={setValorEditado}
                  onAprobar={() => aprobar(i, items[clave]?.nuevo ?? '')}
                  onActivarEdicion={() => setEditando(true)}
                  onAprobarEdicion={() => {
                    setEditando(false)
                    aprobar(i, valorEditado)
                  }}
                  onSaltar={() => saltar(i)}
                  onReintentar={() => prepararCategoria(i)}
                />
              ))}
            </ol>
          )}
        </div>
      )}

      {/* FASE 3 — Finalizado */}
      {fase === 'finalizado' && (
        <ResultadoFinal prs={prsAbiertos} items={items} orden={ordenRef.current} />
      )}

      {/* Cancelado */}
      {fase === 'cancelado' && (
        <div className="mt-4 rounded-lg border border-white/[0.08] bg-[#0a0b0d] p-4 text-sm text-[#c4c7cc]">
          Ejecución cancelada.
          {prsAbiertos.length > 0 && ' Revisa el panel de notificaciones / GitHub.'}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Subcomponentes
// ---------------------------------------------------------------------------
function ResumenConsolidado({ orden, analisis, prMode, setPrMode, onConfirmar }) {
  return (
    <div className="mt-3">
      <p className="text-xs text-[#8a8f98]">
        Resumen de lo que se hará (orden por riesgo: menor → mayor). Nada se toca
        hasta que confirmes.
      </p>

      <div className="mt-3 space-y-2">
        {orden.map((clave) => {
          const meta = META_POR_CLAVE[clave]
          const datos = analisis[clave] || {}
          return (
            <div
              key={clave}
              className="rounded-lg bg-[#121316] p-3 text-sm ring-1 ring-white/[0.08]"
            >
              <span className={'rounded-full px-2 py-0.5 text-xs font-semibold ' + meta.chip}>
                {meta.label}
              </span>
              <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-[#8a8f98]">
                <span>
                  Archivo:{' '}
                  <code className="text-[#c4c7cc]">
                    {getArchivoSugerido(clave, datos)}
                  </code>
                </span>
                <span>
                  Rama:{' '}
                  <code className="text-[#c4c7cc]">
                    {prMode === 'unico'
                      ? 'agente/mejoras-…'
                      : getNombreRama(clave, datos)}
                  </code>
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* PR único vs separados */}
      <fieldset className="mt-4">
        <legend className="text-xs font-medium text-[#8a8f98]">
          Estrategia de PR
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <OpcionPR
            activo={prMode === 'separados'}
            onClick={() => setPrMode('separados')}
            titulo="PRs separados"
            desc="Una rama y un PR por cada categoría."
          />
          <OpcionPR
            activo={prMode === 'unico'}
            onClick={() => setPrMode('unico')}
            titulo="PR único"
            desc="Todos los cambios en una sola rama y un PR."
          />
        </div>
      </fieldset>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onConfirmar}
          className="rounded-md bg-[#007ACC] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#007ACC]/20 hover:bg-[#0b8fe8]"
        >
          Confirmar y ejecutar
        </button>
        <span className="text-xs text-[#62666d]">
          Podrás aprobar/saltar/cancelar cada categoría.
        </span>
      </div>
    </div>
  )
}

function OpcionPR({ activo, onClick, titulo, desc }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-lg p-3 text-left text-sm ring-1 transition ' +
        (activo
          ? 'bg-[#17181b] ring-[#007ACC]/55'
          : 'bg-[#121316] ring-white/[0.08] hover:ring-[#007ACC]/35')
      }
    >
      <span className="font-semibold text-[#f7f8f8]">{titulo}</span>
      <p className="mt-0.5 text-xs text-[#8a8f98]">{desc}</p>
    </button>
  )
}

function CategoriaEjecucion({
  clave,
  item,
  activa,
  editando,
  valorEditado,
  onCambioTexto,
  onAprobar,
  onActivarEdicion,
  onAprobarEdicion,
  onSaltar,
  onReintentar,
}) {
  const meta = META_POR_CLAVE[clave]
  const estado = item.estado || 'pendiente'

  return (
    <li
      className={
        'rounded-lg p-3 ring-1 ' +
        (activa ? 'bg-[#17181b] ring-[#007ACC]/45' : 'bg-[#121316] ring-white/[0.08]')
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className={'rounded-full px-2 py-0.5 text-xs font-semibold ' + meta.chip}>
          {meta.label}
        </span>
        <EstadoBadge estado={estado} prUrl={item.prUrl} />
      </div>

      {item.archivo && (
        <p className="mt-1 text-xs text-[#62666d]">
          <code className="text-[#c4c7cc]">{item.archivo}</code> · rama{' '}
          <code className="text-[#c4c7cc]">{item.rama}</code>
        </p>
      )}

      {estado === 'error' && (
        <div className="mt-2 text-xs text-red-400">
          {item.error}
          <button
            type="button"
            onClick={onReintentar}
            className="ml-2 rounded bg-red-500/20 px-2 py-0.5 text-red-200 hover:bg-red-500/30"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Diff + 4 botones (solo en la categoría activa, en estado diff) */}
      {activa && estado === 'diff' && (
        <>
          <DiffViewer
            original={item.original}
            nuevo={item.nuevo}
            advertencia={item.advertencia}
            editando={editando}
            valorEditado={valorEditado}
            onCambioTexto={onCambioTexto}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {!editando ? (
              <>
                <button
                  type="button"
                  onClick={onAprobar}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#007ACC] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0b8fe8]"
                >
                  <IconCheck className="h-3.5 w-3.5" />
                  Aprobar y continuar
                </button>
                <button
                  type="button"
                  onClick={onActivarEdicion}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#007ACC]/18 px-3 py-1.5 text-xs font-medium text-[#d7efff] ring-1 ring-[#007ACC]/45 hover:bg-[#007ACC]/26"
                >
                  <IconPencil className="h-3.5 w-3.5" />
                  Aprobar con edición
                </button>
                <button
                  type="button"
                  onClick={onSaltar}
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[#e1e3e6] hover:bg-white/[0.07]"
                >
                  <IconSkip className="h-3.5 w-3.5" />
                  Saltar esta categoría
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onAprobarEdicion}
                className="rounded-md bg-[#007ACC] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0b8fe8]"
              >
                Aplicar mi versión y continuar
              </button>
            )}
          </div>
        </>
      )}

      {(estado === 'preparando' || estado === 'commiteando') && (
        <p className="mt-2 flex items-center gap-2 text-xs text-[#8a8f98]">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-700 border-t-[#007ACC]" />
          {estado === 'preparando' ? 'Preparando diff…' : 'Haciendo commit…'}
        </p>
      )}
    </li>
  )
}

function EstadoBadge({ estado, prUrl }) {
  const map = {
    pendiente: ['Pendiente', 'bg-white/10 text-[#c4c7cc]'],
    preparando: ['Preparando…', 'bg-white/10 text-[#c4c7cc]'],
    diff: ['Revisar diff', 'bg-amber-500/15 text-amber-300'],
    commiteando: ['Commit…', 'bg-white/10 text-[#c4c7cc]'],
    commiteado: ['Commit hecho', 'bg-emerald-500/15 text-emerald-300'],
    'pr-abierto': ['PR abierto', 'bg-emerald-500/15 text-emerald-300'],
    saltado: ['Saltado', 'bg-white/10 text-[#c4c7cc]'],
    error: ['Error', 'bg-red-500/15 text-red-300'],
  }
  const [txt, cls] = map[estado] || map.pendiente
  if (estado === 'pr-abierto' && prUrl) {
    return (
      <a
        href={prUrl}
        target="_blank"
        rel="noreferrer"
        className={'rounded-full px-2 py-0.5 text-xs font-medium hover:underline ' + cls}
      >
        {txt} ↗
      </a>
    )
  }
  return <span className={'rounded-full px-2 py-0.5 text-xs font-medium ' + cls}>{txt}</span>
}

function RollbackPanel({ prs, seleccion, onToggle, onCerrar, onDejar }) {
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
      <p className="text-sm font-semibold text-red-200">
        ¿Deseas cerrar los PRs ya abiertos?
      </p>
      <ul className="mt-3 space-y-2">
        {prs.map((pr) => (
          <li key={pr.numero} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={seleccion.has(pr.numero)}
              onChange={() => onToggle(pr.numero)}
              className="h-4 w-4 accent-red-500"
            />
            <a
              href={pr.url}
              target="_blank"
              rel="noreferrer"
              className="text-[#c4c7cc] hover:underline"
            >
              PR #{pr.numero} ({pr.clave})
            </a>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onCerrar}
          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
        >
          Cerrar seleccionados
        </button>
        <button
          type="button"
          onClick={onDejar}
          className="rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[#e1e3e6] hover:bg-white/[0.07]"
        >
          No cerrar ninguno
        </button>
      </div>
    </div>
  )
}

function ResultadoFinal({ prs, items, orden }) {
  const saltados = orden.filter((c) => items[c]?.estado === 'saltado')
  return (
    <div className="mt-4 rounded-lg border border-white/[0.08] bg-[#0a0b0d] p-4">
      <p className="text-sm font-semibold text-[#7cc7ff]">Ejecución completada</p>
      {prs.length > 0 ? (
        <ul className="mt-2 space-y-1 text-sm">
          {prs.map((pr) => (
            <li key={pr.numero}>
              <a
                href={pr.url}
                target="_blank"
                rel="noreferrer"
                className="text-[#7cc7ff] hover:underline"
              >
                PR #{pr.numero} ({pr.clave}) ↗
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-[#8a8f98]">No se abrió ningún PR.</p>
      )}
      {saltados.length > 0 && (
        <p className="mt-2 text-xs text-[#62666d]">
          Categorías saltadas: {saltados.map((c) => META_POR_CLAVE[c].label).join(', ')}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers de mensajes
// ---------------------------------------------------------------------------
function tituloCorto(meta, datos) {
  return datos.feature_principal || datos.principio_violado || meta.label
}

function construirMensajeCommit(meta, datos) {
  return `${meta.tipoCambio}: ${tituloCorto(meta, datos)} (vía GitHub Trending Agent)`
}

function construirPR(claves, analisis, repo) {
  const footer = `\n\n---\n_Generado con GitHub Trending Agent para ${repo.nombre}._`
  if (claves.length === 1) {
    const c = claves[0]
    const meta = META_POR_CLAVE[c]
    const datos = analisis[c] || {}
    return {
      titulo: `[${meta.tipoCambio}] ${tituloCorto(meta, datos)}`,
      cuerpo: (datos.resumen || meta.label) + footer,
    }
  }
  const cuerpo = claves
    .map((c) => {
      const meta = META_POR_CLAVE[c]
      const datos = analisis[c] || {}
      return `### ${meta.label}\n${datos.resumen || ''}`
    })
    .join('\n\n')
  return { titulo: 'Varias mejoras vía GitHub Trending Agent', cuerpo: cuerpo + footer }
}
