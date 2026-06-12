// Proveedor Google Gemini. Firma idéntica a openai.js: analizar(prompt, apiKey) → objeto JSON.

// gemini-2.5-flash: nivel gratuito, ventana de 1M tokens (ideal para README +
// issues + estructura completos). Verificar disponibilidad en ai.google.dev/pricing.
const MODELO = 'gemini-2.5-flash'

function endpoint(apiKey) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${apiKey}`
}

export async function analizar(prompt, apiKey) {
  const res = await fetch(endpoint(apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
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
