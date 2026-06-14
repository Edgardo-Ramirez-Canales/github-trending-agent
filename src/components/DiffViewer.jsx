import { useMemo } from 'react'
import { diffLineas, resumenDiff } from '../utils/diff.js'
import { IconAlert } from './icons.jsx'

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
    <div className="mt-3 rounded-lg ring-1 ring-white/[0.08]">
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-2 rounded-t-lg bg-[#0a0b0d] px-3 py-2 text-xs">
        <span className="text-[#8a8f98]">
          {editando ? 'Editando contenido' : 'Diff propuesto'}
        </span>
        <span className="flex gap-3 font-mono">
          <span className="text-emerald-400">+{agregadas}</span>
          <span className="text-red-400">-{eliminadas}</span>
        </span>
      </div>

      {/* Aviso de impacto en imports */}
      {advertencia && (
        <div className="flex items-center gap-1.5 border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          <IconAlert className="h-3.5 w-3.5 shrink-0" />
          {advertencia}
        </div>
      )}

      {/* Cuerpo: edición o diff */}
      {editando ? (
        <textarea
          value={valorEditado}
          onChange={(e) => onCambioTexto?.(e.target.value)}
          spellCheck={false}
          className="block h-72 w-full resize-y rounded-b-lg bg-[#0a0b0d] p-3 font-mono text-xs text-[#e1e3e6] outline-none focus:ring-2 focus:ring-[#007ACC]/25"
        />
      ) : (
        <div className="max-h-80 overflow-auto rounded-b-lg bg-[#0a0b0d] font-mono text-xs">
          {diff.map((l, idx) => (
            <div
              key={idx}
              className={
                'flex gap-2 px-3 py-0.5 ' +
                (l.tipo === 'agregado'
                  ? 'bg-emerald-500/10 text-emerald-300'
                  : l.tipo === 'eliminado'
                    ? 'bg-red-500/10 text-red-300'
                    : 'text-[#8a8f98]')
              }
            >
              <span className="select-none text-[#4a4d54]">
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
