// Bloque de diagnóstico (solo lectura) que reemplaza al antiguo "Score de
// oportunidad". Muestra para qué sirve el repo, su puntaje de madurez y los
// factores de salud como chips ✓/✗.

const FACTORES = [
  { clave: 'tiene_tests', label: 'Tests' },
  { clave: 'tiene_ci', label: 'CI' },
  { clave: 'tiene_licencia', label: 'Licencia' },
  { clave: 'readme_completo', label: 'README completo' },
  { clave: 'actividad_reciente', label: 'Actividad reciente' },
  { clave: 'tiene_contributing', label: 'CONTRIBUTING' },
]

export default function SaludRepo({ datos }) {
  if (!datos) return null
  const factores = datos.factores || {}

  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#121316] p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[#e1e3e6]">Salud del repositorio</h3>
        <span className="rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-semibold text-sky-300 ring-1 ring-sky-500/30">
          Madurez {datos.puntaje_global ?? '—'}/10
        </span>
      </div>

      {datos.descripcion_funcional && (
        <p className="mt-2 text-sm text-[#8a8f98]">{datos.descripcion_funcional}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {FACTORES.map((f) => (
          <FactorChip key={f.clave} label={f.label} ok={Boolean(factores[f.clave])} />
        ))}
        {factores.ratio_issues != null && (
          <span className="rounded-full bg-white/[0.04] px-2.5 py-0.5 text-xs text-[#8a8f98] ring-1 ring-white/[0.08]">
            Ratio issues: {Number(factores.ratio_issues).toFixed(2)}
          </span>
        )}
      </div>

      {datos.justificacion && (
        <p className="mt-3 text-xs text-[#62666d]">{datos.justificacion}</p>
      )}
    </div>
  )
}

function FactorChip({ label, ok }) {
  return (
    <span
      className={
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ' +
        (ok
          ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
          : 'bg-rose-500/10 text-rose-300/80 ring-rose-500/25')
      }
    >
      <span aria-hidden="true">{ok ? '✓' : '✗'}</span>
      {label}
    </span>
  )
}
