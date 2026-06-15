// Proveedor DeepSeek. Firma común: analizar(prompt, apiKey, modelo) → objeto JSON.
// API compatible con OpenAI (chat/completions + response_format json_object),
// por eso es casi idéntico a openai.js, solo cambia el endpoint.

const ENDPOINT = 'https://api.deepseek.com/v1/chat/completions'
const MODELO_DEFAULT = 'deepseek-chat'

export async function analizar(prompt, apiKey, modelo = MODELO_DEFAULT) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelo,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    }),
  })

  if (!res.ok) {
    const detalle = await res.text().catch(() => '')
    throw new Error(`DeepSeek (${res.status}): ${detalle.slice(0, 200)}`)
  }

  const data = await res.json()
  const contenido = data?.choices?.[0]?.message?.content
  if (!contenido) throw new Error('DeepSeek: respuesta vacía')

  // Puede lanzar SyntaxError si el JSON viene mal formado → index.js reintenta.
  return JSON.parse(contenido)
}
