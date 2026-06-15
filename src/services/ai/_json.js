// Extractor de JSON tolerante para proveedores sin "JSON mode" nativo
// (Anthropic, MiniMax). Quita fences ```json … ``` y recorta hasta el primer
// objeto { … } válido. Lanza SyntaxError si no logra parsear → index.js reintenta.
export function extraerJSON(texto) {
  if (!texto || typeof texto !== 'string') {
    throw new Error('Respuesta vacía')
  }

  let limpio = texto.trim()

  // Quita vallas de código markdown: ```json … ``` o ``` … ```
  const fence = limpio.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) limpio = fence[1].trim()

  // Recorta al primer objeto balanceado por si hay texto antes/después.
  const ini = limpio.indexOf('{')
  const fin = limpio.lastIndexOf('}')
  if (ini !== -1 && fin !== -1 && fin > ini) {
    limpio = limpio.slice(ini, fin + 1)
  }

  return JSON.parse(limpio)
}
