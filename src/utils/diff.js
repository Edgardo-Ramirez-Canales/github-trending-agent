// Utilidades de diff para el Modo C: comparar el archivo original vs el contenido
// generado por la IA y detectar cambios que afecten imports de otros archivos.

const MAX_LINEAS_LCS = 1500 // guard de rendimiento para el algoritmo O(m*n)

// Diff línea a línea (LCS). Devuelve [{ tipo: 'igual'|'agregado'|'eliminado', texto }].
export function diffLineas(viejo, nuevo) {
  const a = (viejo || '').split('\n')
  const b = (nuevo || '').split('\n')

  // Archivos muy grandes: evitar LCS, mostrar todo como reemplazo.
  if (a.length > MAX_LINEAS_LCS || b.length > MAX_LINEAS_LCS) {
    return [
      ...a.map((t) => ({ tipo: 'eliminado', texto: t })),
      ...b.map((t) => ({ tipo: 'agregado', texto: t })),
    ]
  }

  const m = a.length
  const n = b.length
  // dp[i][j] = longitud del LCS de a[i..] y b[j..]
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] =
        a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const res = []
  let i = 0
  let j = 0
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      res.push({ tipo: 'igual', texto: a[i] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      res.push({ tipo: 'eliminado', texto: a[i] })
      i++
    } else {
      res.push({ tipo: 'agregado', texto: b[j] })
      j++
    }
  }
  while (i < m) res.push({ tipo: 'eliminado', texto: a[i++] })
  while (j < n) res.push({ tipo: 'agregado', texto: b[j++] })
  return res
}

// Conteo rápido de líneas añadidas/eliminadas (para el encabezado del diff).
export function resumenDiff(diff) {
  let agregadas = 0
  let eliminadas = 0
  for (const l of diff) {
    if (l.tipo === 'agregado') agregadas++
    else if (l.tipo === 'eliminado') eliminadas++
  }
  return { agregadas, eliminadas }
}

const EXT_CODIGO = ['.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.rb', '.java', '.rs']

// Validación previa al push: si el archivo es de código y toca imports/exports,
// el cambio podría afectar a otros archivos → se avisa antes de continuar.
export function detectarImpactoImports(archivo = '', contenido = '') {
  const esCodigo = EXT_CODIGO.some((e) => archivo.toLowerCase().endsWith(e))
  if (!esCodigo) return null
  const tocaImports = /^\s*(import\s|from\s|export\s|require\(|#include)/m.test(
    contenido,
  )
  if (!tocaImports) return null
  return 'Este cambio modifica imports/exports. Podría afectar a otros archivos del repo. Revisa antes de aprobar.'
}
