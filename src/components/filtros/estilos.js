// Clases Tailwind compartidas por los controles de filtro.
// Centralizar evita repetir los mismos strings largos en cada componente y
// mantiene la apariencia consistente entre paneles (trending / usuario / repo).

export const LABEL = 'text-xs font-medium text-[#8a8f98]'

export const INPUT =
  'w-full rounded-md border border-white/[0.08] bg-[#0a0b0d] px-3 py-2 text-sm text-[#f7f8f8] placeholder:text-[#4a4d54] outline-none transition focus:border-[#007ACC]/70 focus:ring-2 focus:ring-[#007ACC]/25'

export const SELECT =
  'rounded-md border border-white/[0.08] bg-[#0a0b0d] px-3 py-2 text-sm text-[#f7f8f8] outline-none transition focus:border-[#007ACC]/70 focus:ring-2 focus:ring-[#007ACC]/25'

// Chip/botón tipo "pill" (presets de fecha, lenguajes, etc.).
export function pill(activo) {
  return (
    'rounded-md px-2.5 py-1 text-xs font-medium transition ' +
    (activo
      ? 'bg-[#007ACC]/18 text-sky-100 ring-1 ring-[#007ACC]/50'
      : 'bg-white/[0.04] text-[#c4c7cc] ring-1 ring-white/[0.08] hover:bg-white/[0.07]')
  )
}
