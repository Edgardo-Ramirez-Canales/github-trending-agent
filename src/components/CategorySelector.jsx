import { useState } from 'react'
import { CATEGORIAS_ACCION, getArchivoSugerido } from '../utils/categorias.js'

// Categorías accionables agrupadas (PR / artefacto), con cabecera de control
// (toggle de idioma EN↔ES + botón "Análisis profundo") y estado atenuado para
// las que no aplican al repo.
export default function CategorySelector({
  analisis,
  seleccionadas,
  onToggle,
  onAtacar,
  idiomaRepo,
  onCambiarIdioma,
  onAnalisisProfundo,
  modo,
  cargando,
}) {
  if (!analisis) return null

  const pr = CATEGORIAS_ACCION.filter((c) => c.grupo === 'pr')
  const artefactos = CATEGORIAS_ACCION.filter((c) => c.grupo === 'artefacto')

  return (
    <div className="space-y-4">
      <Cabecera
        idiomaRepo={idiomaRepo}
        onCambiarIdioma={onCambiarIdioma}
        onAnalisisProfundo={onAnalisisProfundo}
        modo={modo}
        cargando={cargando}
      />

      <Grupo titulo="Aportes para PR">
        {pr.map((cat) => (
          <CategoriaCard
            key={cat.clave}
            cat={cat}
            datos={analisis[cat.clave] || {}}
            seleccionada={seleccionadas.includes(cat.clave)}
            onToggle={() => onToggle?.(cat.clave)}
            onAtacar={() => onAtacar?.(cat.clave)}
          />
        ))}
      </Grupo>

      <Grupo titulo="Artefactos (descarga local)">
        {artefactos.map((cat) => (
          <CategoriaCard
            key={cat.clave}
            cat={cat}
            datos={analisis[cat.clave] || {}}
            seleccionada={seleccionadas.includes(cat.clave)}
            onToggle={() => onToggle?.(cat.clave)}
            onAtacar={() => onAtacar?.(cat.clave)}
          />
        ))}
      </Grupo>
    </div>
  )
}

function Cabecera({ idiomaRepo, onCambiarIdioma, onAnalisisProfundo, modo, cargando }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-[#62666d]">
        Marca las categorías sobre las que quieras actuar.
      </p>
      <div className="flex items-center gap-2">
        <ToggleIdioma idioma={idiomaRepo} onCambiar={onCambiarIdioma} disabled={cargando} />
        <button
          type="button"
          onClick={onAnalisisProfundo}
          disabled={cargando || modo === 'B'}
          className="rounded-md bg-[#007ACC]/18 px-3 py-1 text-xs font-medium text-[#d7efff] ring-1 ring-[#007ACC]/45 enabled:hover:bg-[#007ACC]/26 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007ACC]"
          title="Reanaliza leyendo el código real (dos pasadas, consume más tokens)"
        >
          {modo === 'B' ? 'Análisis profundo ✓' : 'Análisis profundo'}
        </button>
      </div>
    </div>
  )
}

function ToggleIdioma({ idioma, onCambiar, disabled }) {
  return (
    <div className="inline-flex overflow-hidden rounded-md ring-1 ring-white/[0.12]">
      {['en', 'es'].map((id) => (
        <button
          key={id}
          type="button"
          disabled={disabled}
          onClick={() => onCambiar?.(id)}
          className={
            'px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 ' +
            (idioma === id
              ? 'bg-white/[0.12] text-[#e1e3e6]'
              : 'text-[#8a8f98] hover:text-[#e1e3e6]')
          }
        >
          {id.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

function Grupo({ titulo, children }) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-[#62666d]">
        {titulo}
      </h4>
      {children}
    </div>
  )
}

function CategoriaCard({ cat, datos, seleccionada, onToggle, onAtacar }) {
  const [abierta, setAbierta] = useState(false)
  const score = Number(datos.score) || 0
  const noAplica = datos.aplica === false

  return (
    <div
      className={
        'rounded-lg bg-[#121316] p-4 ring-1 transition ' +
        (noAplica
          ? 'opacity-50 ring-white/[0.06]'
          : seleccionada
            ? cat.anillo
            : 'ring-white/[0.08]')
      }
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={seleccionada}
          onChange={onToggle}
          disabled={noAplica}
          className="mt-1 shrink-0 ctrl-check disabled:cursor-not-allowed"
          aria-label={`Seleccionar ${cat.label}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={'rounded-full px-2.5 py-0.5 text-xs font-semibold ' + cat.chip}>
              {cat.label}
            </span>
            {!noAplica && <ScoreBar score={score} barra={cat.barra} />}
          </div>

          {noAplica ? (
            <p className="mt-2 text-sm text-[#8a8f98]">
              No aplica: {datos.motivo_no_aplica || 'sin oportunidad detectada'}
            </p>
          ) : (
            <>
              {datos.resumen && (
                <p className="mt-2 text-sm text-[#8a8f98]">{datos.resumen}</p>
              )}
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAbierta((v) => !v)}
                  className="text-xs text-[#8a8f98] underline-offset-2 hover:text-[#e1e3e6] hover:underline"
                >
                  {abierta ? 'Ocultar detalle' : 'Ver detalle'}
                </button>
                <button
                  type="button"
                  onClick={onAtacar}
                  className="text-xs font-medium text-[#7cc7ff] hover:text-[#d7efff]"
                >
                  {cat.destino === 'artefacto' ? 'Generar y descargar' : 'Atacar'}
                </button>
              </div>
              {abierta && <Detalle cat={cat} datos={datos} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Detalle específico por categoría: muestra solo los campos propios de cada una.
function Detalle({ cat, datos }) {
  const archivo = getArchivoSugerido(cat.clave, datos)
  return (
    <div className="mt-3 space-y-2 border-t border-white/[0.08] pt-3 text-sm">
      <p className="text-xs text-[#62666d]">
        Archivo objetivo: <code className="text-[#c4c7cc]">{archivo}</code>
      </p>

      {cat.clave === 'mejora_docs' && (
        <>
          <Lista label="Faltan" items={datos.secciones_faltantes} />
          <CodeBlock texto={datos.contenido_propuesto} />
        </>
      )}

      {cat.clave === 'test_faltante' && (
        <>
          <Campo label="Función" valor={datos.funcion_objetivo} />
          <Campo label="Archivo fuente" valor={datos.archivo_afectado} />
          <CodeBlock texto={datos.codigo_propuesto} />
        </>
      )}

      {cat.clave === 'good_first_issue' && (
        <>
          <Campo
            label="Issue"
            valor={
              datos.issue_numero
                ? `#${datos.issue_numero} ${datos.issue_titulo || ''}`
                : datos.issue_titulo
            }
          />
          <Campo label="Archivo" valor={datos.archivo_afectado} />
          <CodeBlock texto={datos.codigo_propuesto} />
        </>
      )}

      {cat.clave === 'features_faltantes' && (
        <>
          <Campo label="Feature" valor={datos.feature_principal} />
          <CodeBlock texto={datos.codigo_propuesto} />
        </>
      )}

      {cat.clave === 'fix_pequeno' && (
        <>
          <Campo label="Tipo" valor={datos.tipo} />
          {datos.repro && <p className="text-[#8a8f98]">Repro: {datos.repro}</p>}
          {datos.explicacion_cambios && (
            <p className="text-[#8a8f98]">{datos.explicacion_cambios}</p>
          )}
          <CodeBlock texto={datos.codigo_refactorizado} />
        </>
      )}

      {cat.clave === 'a11y' && (
        <>
          <Campo label="Problema" valor={datos.problema} />
          <Campo label="Archivo" valor={datos.archivo_afectado} />
          <CodeBlock texto={datos.codigo_propuesto} />
        </>
      )}

      {cat.clave === 'dependencia_obsoleta' && (
        <>
          {Array.isArray(datos.dependencias) && datos.dependencias.length > 0 && (
            <ul className="space-y-1 text-[#c4c7cc]">
              {datos.dependencias.map((d, i) => (
                <li key={i}>
                  <code>{d.nombre}</code>{' '}
                  <span className="text-[#62666d]">
                    {d.version_actual} → {d.version_sugerida}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <CodeBlock texto={datos.contenido_propuesto} />
        </>
      )}

      {cat.clave === 'diagrama_arquitectura' && (
        <>
          {datos.resumen_funcional && (
            <p className="text-[#8a8f98]">{datos.resumen_funcional}</p>
          )}
          <p className="text-xs text-[#62666d]">
            {(datos.nodos?.length ?? 0)} módulos · {(datos.aristas?.length ?? 0)} relaciones
          </p>
        </>
      )}

      {cat.clave === 'skill_plantilla' && (
        <>
          <Campo label="Skill" valor={datos.nombre_skill} />
          <CodeBlock texto={datos.contenido_skill} />
        </>
      )}

      {cat.clave === 'onboarding' && <CodeBlock texto={datos.contenido} />}
    </div>
  )
}

function Campo({ label, valor }) {
  if (!valor) return null
  return (
    <p className="text-[#c4c7cc]">
      <span className="text-[#62666d]">{label}:</span> {valor}
    </p>
  )
}

function Lista({ label, items }) {
  if (!Array.isArray(items) || !items.length) return null
  return (
    <p className="text-[#c4c7cc]">
      <span className="text-[#62666d]">{label}:</span> {items.join(', ')}
    </p>
  )
}

function CodeBlock({ texto }) {
  if (!texto) return null
  return (
    <pre className="max-h-64 overflow-auto rounded-md bg-[#0a0b0d] p-3 text-xs text-[#c4c7cc] ring-1 ring-white/[0.08]">
      <code>{texto}</code>
    </pre>
  )
}

function ScoreBar({ score, barra }) {
  const pct = Math.max(0, Math.min(10, score)) * 10
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-white/10">
        <div className={'h-full rounded-full ' + barra} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-[#c4c7cc]">{score}/10</span>
    </div>
  )
}
