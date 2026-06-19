// Detección simple del idioma de un repo a partir de su README.
// Heurística por stopwords: cuenta cuántas palabras frecuentes de cada idioma
// aparecen y devuelve el ganador. No pretende ser un detector lingüístico
// completo — solo distinguir EN vs ES para decidir el idioma del output a GitHub.
// El usuario siempre puede sobreescribir con el toggle manual.

const STOPWORDS_EN = [
  'the', 'and', 'for', 'with', 'this', 'that', 'you', 'your', 'are', 'use',
  'used', 'using', 'from', 'have', 'will', 'can', 'how', 'what', 'when',
  'install', 'usage', 'features', 'license', 'example',
]

const STOPWORDS_ES = [
  'el', 'la', 'los', 'las', 'de', 'del', 'que', 'con', 'para', 'una', 'uno',
  'por', 'como', 'esta', 'este', 'son', 'usar', 'desde', 'tiene', 'puede',
  'instalar', 'uso', 'caracteristicas', 'licencia', 'ejemplo',
]

// Cuenta cuántas ocurrencias de las stopwords aparecen en el texto tokenizado.
function contar(tokens, stopwords) {
  const set = new Set(stopwords)
  let total = 0
  for (const t of tokens) if (set.has(t)) total++
  return total
}

// Devuelve 'en' | 'es'. Default 'en' cuando no hay señal suficiente
// (README vacío, empate o solo código).
export function detectarIdioma(readme = '') {
  const texto = (readme || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos para emparejar stopwords
  const tokens = texto.match(/[a-z]+/g) || []
  if (tokens.length < 10) return 'en'

  const en = contar(tokens, STOPWORDS_EN)
  const es = contar(tokens, STOPWORDS_ES)
  return es > en ? 'es' : 'en'
}
