// Proveedor Anthropic (Claude). Firma común: analizar(prompt, apiKey, modelo) → objeto JSON.
//
// Diferencias vs OpenAI:
//   - No tiene "JSON mode" nativo → forzamos JSON con prefill: el mensaje del
//     assistant empieza con "{", así el modelo continúa el objeto. Reponemos la
//     "{" inicial antes de parsear.
//   - Header x-api-key + anthropic-version en vez de Bearer.
//   - anthropic-dangerous-direct-browser-access habilita CORS desde el navegador.
import { extraerJSON } from './_json.js'

const ENDPOINT = 'https://api.anthropic.com/v1/messages'
const VERSION = '2023-06-01'
const MODELO_DEFAULT = 'claude-3-5-haiku-latest'

export async function analizar(prompt, apiKey, modelo = MODELO_DEFAULT, maxTokens = 4096) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': VERSION,
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: modelo,
      max_tokens: maxTokens,
      temperature: 0.4,
      messages: [
        { role: 'user', content: prompt },
        // Prefill: forzamos que la respuesta sea un objeto JSON.
        { role: 'assistant', content: '{' },
      ],
    }),
  })

  if (!res.ok) {
    const detalle = await res.text().catch(() => '')
    throw new Error(`Claude (${res.status}): ${detalle.slice(0, 200)}`)
  }

  const data = await res.json()
  const texto = data?.content?.[0]?.text
  if (!texto) throw new Error('Claude: respuesta vacía')

  // El prefill consumió la "{" inicial; la reponemos antes de parsear.
  return extraerJSON('{' + texto)
}
