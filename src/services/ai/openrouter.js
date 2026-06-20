// Proveedor OpenRouter. Firma común: analizar(prompt, apiKey, modelo) → objeto JSON.
// API compatible con OpenAI (chat/completions), pero enruta a muchos modelos vía
// slug "proveedor/modelo". Usamos modelos :free; éstos NO garantizan JSON-mode,
// por eso parseamos con el extractor tolerante (_json.js) en vez de confiar en
// response_format. Headers HTTP-Referer / X-Title son recomendados por OpenRouter.
import { extraerJSON } from './_json.js'

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'
const MODELO_DEFAULT = 'meta-llama/llama-3.3-70b-instruct:free'

// Modelo "Auto": en vez de fijar uno, mandamos varios free y OpenRouter usa el
// primero DISPONIBLE (si uno está rate-limited / caído, salta al siguiente).
// Igual al selector "auto" de la web de OpenRouter.
const AUTO_ID = 'auto-free'
// OpenRouter limita `models` a 3 ítems máx.
const AUTO_LISTA = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'openai/gpt-oss-120b:free',
]

export async function analizar(prompt, apiKey, modelo = MODELO_DEFAULT, maxTokens = 4096) {
  // Con AUTO mandamos `models` (lista de fallback); si no, `model` (uno solo).
  const ruteo =
    modelo === AUTO_ID
      ? { models: AUTO_LISTA }
      : { model: modelo }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github-trending-agent.local',
      'X-Title': 'GitHub Trending Agent',
    },
    body: JSON.stringify({
      ...ruteo,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: maxTokens,
    }),
  })

  if (!res.ok) {
    const detalle = await res.text().catch(() => '')
    throw new Error(`OpenRouter (${res.status}): ${detalle.slice(0, 200)}`)
  }

  const data = await res.json()
  const contenido = data?.choices?.[0]?.message?.content
  if (!contenido) throw new Error('OpenRouter: respuesta vacía')

  // Free models suelen envolver el JSON en prosa o fences → extractor tolerante.
  // Puede lanzar SyntaxError si viene mal formado → index.js reintenta.
  return extraerJSON(contenido)
}
