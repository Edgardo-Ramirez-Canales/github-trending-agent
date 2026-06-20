// Proveedor MiniMax. Firma común: analizar(prompt, apiKey, modelo) → objeto JSON.
// Endpoint chatcompletion_v2: estructura compatible con OpenAI (choices[].message.content).
// MiniMax no garantiza JSON limpio → pasamos por extraerJSON (quita fences, etc.).
import { extraerJSON } from './_json.js'

const ENDPOINT = 'https://api.minimax.io/v1/text/chatcompletion_v2'
const MODELO_DEFAULT = 'MiniMax-Text-01'

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
      temperature: 0.4,
      max_tokens: maxTokens,
    }),
  })

  if (!res.ok) {
    const detalle = await res.text().catch(() => '')
    throw new Error(`MiniMax (${res.status}): ${detalle.slice(0, 200)}`)
  }

  const data = await res.json()

  // MiniMax devuelve HTTP 200 incluso en error: el estado real va en base_resp.
  // status_code 0 = éxito; cualquier otro (p.ej. 1008 "insufficient balance") es fallo.
  const estado = data?.base_resp
  if (estado && estado.status_code !== 0) {
    throw new Error(
      `MiniMax (${estado.status_code}): ${estado.status_msg || 'error desconocido'}`,
    )
  }

  const contenido = data?.choices?.[0]?.message?.content
  if (!contenido) throw new Error('MiniMax: respuesta vacía')

  return extraerJSON(contenido)
}
