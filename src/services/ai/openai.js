// Proveedor OpenAI. Firma común: analizar(prompt, apiKey, modelo) → objeto JSON.
// Esto permite que ai/index.js intercambie proveedores sin lógica condicional extra.

const ENDPOINT = 'https://api.openai.com/v1/chat/completions'

// Modelo por defecto si index.js no pasa uno. gpt-4o-mini es económico y soporta
// JSON mode; los modelos disponibles se listan en el registry (registry.js).
const MODELO_DEFAULT = 'gpt-4o-mini'

export async function analizar(prompt, apiKey, modelo = MODELO_DEFAULT, maxTokens = 4096) {
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
      max_tokens: maxTokens,
    }),
  })

  if (!res.ok) {
    const detalle = await res.text().catch(() => '')
    throw new Error(`OpenAI (${res.status}): ${detalle.slice(0, 200)}`)
  }

  const data = await res.json()
  const contenido = data?.choices?.[0]?.message?.content
  if (!contenido) throw new Error('OpenAI: respuesta vacía')

  // Puede lanzar SyntaxError si el JSON viene mal formado → index.js reintenta.
  return JSON.parse(contenido)
}
