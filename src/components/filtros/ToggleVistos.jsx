// Toggle "incluir repos ya vistos" (servidor: cambia la regla de ocultado).
// `sugerir` = true muestra un aviso cuando el rango de fecha es amplio y
// conviene activarlo para no creer que faltan repos.
export default function ToggleVistos({ checked, onChange, sugerir }) {
  return (
    <div>
      <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[#8a8f98]">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-white/20 bg-[#0a0b0d] accent-[#007ACC]"
        />
        Incluir repos ya vistos
      </label>
      {sugerir && !checked && (
        <p className="mt-1 text-[11px] text-amber-300/80">
          Rango amplio: activá esto para no esconder repos que ya viste.
        </p>
      )}
    </div>
  )
}
