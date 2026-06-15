// Registry de proveedores de IA: ÚNICA fuente de verdad.
// Agregar un proveedor nuevo = añadir una entrada aquí. La UI (AIProviderSelector),
// el storage (claves/modelos por id) e index.js (despacho) se derivan de esto.
//
// Forma de cada entrada:
//   id            identificador estable (clave en localStorage)
//   nombre        etiqueta visible
//   placeholder   ejemplo del formato de la clave (input)
//   docsUrl       link para obtener la API key
//   color         acento hex para la UI
//   analizar      fn (prompt, apiKey, modelo) → objeto JSON  [misma firma para todos]
//   modelos       [{ id, etiqueta }] para el selector de modelo
//   modeloDefault id del modelo por defecto
import { analizar as analizarOpenAI } from './openai.js'
import { analizar as analizarGemini } from './gemini.js'
import { analizar as analizarClaude } from './claude.js'
import { analizar as analizarDeepSeek } from './deepseek.js'
import { analizar as analizarMiniMax } from './minimax.js'

export const PROVEEDORES = [
  {
    id: 'openai',
    nombre: 'OpenAI',
    placeholder: 'sk-…',
    docsUrl: 'https://platform.openai.com/api-keys',
    color: '#10a37f',
    analizar: analizarOpenAI,
    modeloDefault: 'gpt-4o-mini',
    modelos: [
      { id: 'gpt-4o-mini', etiqueta: 'GPT-4o mini (económico)' },
      { id: 'gpt-4o', etiqueta: 'GPT-4o' },
      { id: 'gpt-4.1-mini', etiqueta: 'GPT-4.1 mini' },
      { id: 'gpt-4.1', etiqueta: 'GPT-4.1' },
    ],
  },
  {
    id: 'gemini',
    nombre: 'Gemini',
    placeholder: 'AIza… / AQ.…',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    color: '#4285f4',
    analizar: analizarGemini,
    modeloDefault: 'gemini-2.5-flash',
    modelos: [
      { id: 'gemini-2.5-flash', etiqueta: 'Gemini 2.5 Flash (gratis)' },
      { id: 'gemini-2.5-pro', etiqueta: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.0-flash', etiqueta: 'Gemini 2.0 Flash' },
    ],
  },
  {
    id: 'claude',
    nombre: 'Claude',
    placeholder: 'sk-ant-…',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    color: '#d97757',
    analizar: analizarClaude,
    modeloDefault: 'claude-3-5-haiku-latest',
    modelos: [
      { id: 'claude-3-5-haiku-latest', etiqueta: 'Claude 3.5 Haiku (económico)' },
      { id: 'claude-3-5-sonnet-latest', etiqueta: 'Claude 3.5 Sonnet' },
      { id: 'claude-sonnet-4-5', etiqueta: 'Claude Sonnet 4.5' },
    ],
  },
  {
    id: 'deepseek',
    nombre: 'DeepSeek',
    placeholder: 'sk-…',
    docsUrl: 'https://platform.deepseek.com/api_keys',
    color: '#4d6bfe',
    analizar: analizarDeepSeek,
    modeloDefault: 'deepseek-chat',
    modelos: [
      { id: 'deepseek-chat', etiqueta: 'DeepSeek Chat' },
      { id: 'deepseek-reasoner', etiqueta: 'DeepSeek Reasoner' },
    ],
  },
  {
    id: 'minimax',
    nombre: 'MiniMax',
    placeholder: 'eyJ… (JWT)',
    docsUrl: 'https://www.minimax.io/platform/user-center/basic-information',
    color: '#ff4d4f',
    analizar: analizarMiniMax,
    modeloDefault: 'MiniMax-Text-01',
    modelos: [
      { id: 'MiniMax-Text-01', etiqueta: 'MiniMax Text 01' },
      { id: 'abab6.5s-chat', etiqueta: 'abab6.5s Chat' },
    ],
  },
]

// --- helpers derivados ---
export const IDS_PROVEEDORES = PROVEEDORES.map((p) => p.id)

const POR_ID = Object.fromEntries(PROVEEDORES.map((p) => [p.id, p]))

export function getProveedor(id) {
  return POR_ID[id] || null
}

export function esProveedorValido(id) {
  return Boolean(POR_ID[id])
}

// id del proveedor por defecto (primero de la lista) para fallbacks.
export const PROVEEDOR_DEFAULT = PROVEEDORES[0].id
