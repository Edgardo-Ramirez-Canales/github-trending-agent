// Proveedor Groq. Firma común: analizar(prompt, apiKey, modelo) → objeto JSON.
// API compatible con OpenAI (chat/completions). Free tier sin tarjeta y CORS abierto
// (access-control-allow-origin: *) → funciona directo desde el navegador.
// Pide JSON-mode nativo; aun así parseamos con extractor tolerante por seguridad.
import { extraerJSON } from './_json.js'

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const MODELO_DEFAULT = 'llama-3.3-70b-versatile'

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
    throw new Error(`Groq (${res.status}): ${detalle.slice(0, 200)}`)
  }

  const data = await res.json()
  const contenido = data?.choices?.[0]?.message?.content
  if (!contenido) throw new Error('Groq: respuesta vacía')

  // Puede lanzar SyntaxError si el JSON viene mal formado → index.js reintenta.
  return extraerJSON(contenido)
}
