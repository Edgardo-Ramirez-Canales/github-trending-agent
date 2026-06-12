// Proveedor OpenAI. Firma idéntica a gemini.js: analizar(prompt, apiKey) → objeto JSON.
// Esto permite que ai/index.js intercambie proveedores sin lógica condicional extra.

const ENDPOINT = 'https://api.openai.com/v1/chat/completions'

// Modelo económico que soporta JSON mode. gpt-4o-mini es un fallback estable;
// el nombre exacto del modelo "mini/nano" más barato cambia con frecuencia
// (verificar en openai.com/api/pricing).
const MODELO = 'gpt-4o-mini'

export async function analizar(prompt, apiKey) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODELO,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
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
