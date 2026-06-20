// Proveedor Google Gemini. Firma común: analizar(prompt, apiKey, modelo) → objeto JSON.

// gemini-2.5-flash: nivel gratuito, ventana de 1M tokens (ideal para README +
// issues + estructura completos). Modelos disponibles en el registry (registry.js).
const MODELO_DEFAULT = 'gemini-2.5-flash'

function endpoint(apiKey, modelo) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`
}

export async function analizar(prompt, apiKey, modelo = MODELO_DEFAULT, maxTokens = 4096) {
  const res = await fetch(endpoint(apiKey, modelo), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: maxTokens,
      },
    }),
  })

  if (!res.ok) {
    const detalle = await res.text().catch(() => '')
    throw new Error(`Gemini (${res.status}): ${detalle.slice(0, 200)}`)
  }

  const data = await res.json()
  const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!texto) throw new Error('Gemini: respuesta vacía')

  // Puede lanzar SyntaxError si el JSON viene mal formado → index.js reintenta.
  return JSON.parse(texto)
}
