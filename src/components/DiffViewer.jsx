import { useMemo } from 'react'
import { diffLineas, resumenDiff } from '../utils/diff.js'

// Visualizador de diff antes del commit. Verde = añadido, rojo = eliminado.
// En modo edición muestra un textarea para que el usuario ajuste el contenido.
export default function DiffViewer({
  original,
  nuevo,
  advertencia,
  editando,
  valorEditado,
  onCambioTexto,
}) {
  const diff = useMemo(() => diffLineas(original, nuevo), [original, nuevo])
  const { agregadas, eliminadas } = useMemo(() => resumenDiff(diff), [diff])

  return (
    <div className="mt-3 rounded-lg ring-1 ring-white/10">
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-2 rounded-t-lg bg-[#080b12] px-3 py-2 text-xs">
        <span className="text-slate-400">
          {editando ? 'Editando contenido' : 'Diff propuesto'}
        </span>
        <span className="flex gap-3 font-mono">
          <span className="text-emerald-400">+{agregadas}</span>
          <span className="text-red-400">-{eliminadas}</span>
        </span>
      </div>

      {/* Aviso de impacto en imports */}
      {advertencia && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          ⚠️ {advertencia}
        </div>
      )}

      {/* Cuerpo: edición o diff */}
      {editando ? (
        <textarea
          value={valorEditado}
          onChange={(e) => onCambioTexto?.(e.target.value)}
          spellCheck={false}
          className="block h-72 w-full resize-y rounded-b-lg bg-[#060910] p-3 font-mono text-xs text-slate-200 outline-none focus:ring-2 focus:ring-[#007ACC]/25"
        />
      ) : (
        <div className="max-h-80 overflow-auto rounded-b-lg bg-[#060910] font-mono text-xs">
          {diff.map((l, idx) => (
            <div
              key={idx}
              className={
                'flex gap-2 px-3 py-0.5 ' +
                (l.tipo === 'agregado'
                  ? 'bg-emerald-500/10 text-emerald-300'
                  : l.tipo === 'eliminado'
                    ? 'bg-red-500/10 text-red-300'
                    : 'text-slate-400')
              }
            >
              <span className="select-none text-slate-600">
                {l.tipo === 'agregado' ? '+' : l.tipo === 'eliminado' ? '-' : ' '}
              </span>
              <span className="whitespace-pre-wrap break-all">{l.texto || ' '}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
