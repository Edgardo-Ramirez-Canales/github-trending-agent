// Paginación cliente con ventana + elipsis: muestra primera, última, la actual
// y sus vecinas (1 … 4 5 6 … 96), evitando listar cientos de números. Sin lógica
// de datos; solo informa la página elegida vía onPagina. Se oculta con ≤1 página.

// Cuántas páginas mostrar a cada lado de la actual.
const RADIO = 1

// Construye la secuencia visible: números + marcadores 'gap' (elipsis).
function construirRango(pagina, total) {
  const paginas = new Set([1, total, pagina])
  for (let i = 1; i <= RADIO; i++) {
    paginas.add(pagina - i)
    paginas.add(pagina + i)
  }
  const ordenadas = [...paginas].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)

  // Inserta 'gap' donde hay saltos no contiguos.
  const items = []
  let previa = 0
  for (const n of ordenadas) {
    if (n - previa > 1) items.push({ tipo: 'gap', key: `gap-${n}` })
    items.push({ tipo: 'pag', n, key: n })
    previa = n
  }
  return items
}

function Boton({ children, onClick, disabled, activo, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={activo ? 'page' : undefined}
      className={
        'min-w-8 rounded-md px-2.5 py-1 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007ACC] ' +
        (activo
          ? 'bg-[#007ACC]/15 text-sky-100 ring-1 ring-[#007ACC]/40'
          : 'text-[#8a8f98] ring-1 ring-white/[0.08] hover:bg-white/[0.06] hover:text-[#e1e3e6] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#8a8f98]')
      }
    >
      {children}
    </button>
  )
}

export default function Paginacion({ pagina, totalPaginas, onPagina }) {
  if (totalPaginas <= 1) return null

  const items = construirRango(pagina, totalPaginas)

  return (
    <nav
      aria-label="Paginación de repos"
      className="mt-6 flex flex-wrap items-center justify-center gap-1.5"
    >
      <Boton
        onClick={() => onPagina(pagina - 1)}
        disabled={pagina <= 1}
        ariaLabel="Página anterior"
      >
        ‹ Anterior
      </Boton>

      {items.map((it) =>
        it.tipo === 'gap' ? (
          <span key={it.key} className="px-1 text-xs text-[#62666d] select-none">
            …
          </span>
        ) : (
          <Boton
            key={it.key}
            onClick={() => onPagina(it.n)}
            activo={it.n === pagina}
            ariaLabel={`Ir a la página ${it.n}`}
          >
            {it.n}
          </Boton>
        ),
      )}

      <Boton
        onClick={() => onPagina(pagina + 1)}
        disabled={pagina >= totalPaginas}
        ariaLabel="Página siguiente"
      >
        Siguiente ›
      </Boton>
    </nav>
  )
}
