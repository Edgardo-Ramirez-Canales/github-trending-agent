// Generadores de artefactos locales (destino: 'artefacto').
// Producen el contenido como string; la descarga al disco la hace descargar().
// No se publican en GitHub: el usuario se los queda.

// --- Diagrama de arquitectura: HTML autónomo (estilo grafo con glow) ---
// Recibe nodos [{id,label,grupo}] y aristas [{origen,destino,peso}] + un resumen
// funcional en español. Embebe los datos y un layout de fuerzas mínimo en SVG.
export function generarDiagramaHTML(nodos = [], aristas = [], resumen = '') {
  const datos = JSON.stringify({ nodos, aristas })
  const resumenSeguro = escaparHTML(resumen)
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Diagrama de arquitectura</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; background: #0a0b0d; color: #e1e3e6;
         font-family: ui-sans-serif, system-ui, sans-serif; }
  header { padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,.08); }
  h1 { margin: 0 0 8px; font-size: 16px; }
  p { margin: 0; color: #8a8f98; font-size: 14px; max-width: 70ch; }
  svg { display: block; width: 100vw; height: calc(100vh - 90px); }
  .edge { stroke: rgba(255,255,255,.18); stroke-width: 1.5; }
  .edge-label { fill: #62666d; font-size: 11px; }
  .node circle { stroke: #7cc7ff; stroke-width: 2; fill: #121316;
                 filter: url(#glow); }
  .node text { fill: #e1e3e6; font-size: 12px; font-weight: 600;
               text-anchor: middle; dominant-baseline: middle; }
</style>
</head>
<body>
<header>
  <h1>Diagrama de arquitectura</h1>
  <p>${resumenSeguro || 'Grafo de módulos del proyecto.'}</p>
</header>
<svg id="lienzo">
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="b" />
      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
  </defs>
</svg>
<script>
const DATA = ${datos};
const svg = document.getElementById('lienzo');
const W = svg.clientWidth || 1200, H = svg.clientHeight || 700;
const NS = 'http://www.w3.org/2000/svg';

// Posiciones iniciales en círculo + relajación por fuerzas (simple).
const nodos = DATA.nodos.map((n, i) => {
  const a = (2 * Math.PI * i) / Math.max(1, DATA.nodos.length);
  return { ...n, x: W/2 + Math.cos(a)*W/4, y: H/2 + Math.sin(a)*H/4 };
});
const idx = Object.fromEntries(nodos.map((n, i) => [n.id, i]));
const aristas = DATA.aristas.filter((e) => e.origen in idx && e.destino in idx);

for (let iter = 0; iter < 200; iter++) {
  // Repulsión entre nodos.
  for (let i = 0; i < nodos.length; i++) for (let j = i+1; j < nodos.length; j++) {
    let dx = nodos[i].x - nodos[j].x, dy = nodos[i].y - nodos[j].y;
    let d = Math.hypot(dx, dy) || 1, f = 4000 / (d*d);
    nodos[i].x += (dx/d)*f; nodos[i].y += (dy/d)*f;
    nodos[j].x -= (dx/d)*f; nodos[j].y -= (dy/d)*f;
  }
  // Atracción por aristas.
  for (const e of aristas) {
    const a = nodos[idx[e.origen]], b = nodos[idx[e.destino]];
    let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, f = (d - 160) * 0.01;
    a.x += (dx/d)*f; a.y += (dy/d)*f; b.x -= (dx/d)*f; b.y -= (dy/d)*f;
  }
  for (const n of nodos) {
    n.x = Math.max(60, Math.min(W-60, n.x));
    n.y = Math.max(60, Math.min(H-60, n.y));
  }
}

function el(tag, attrs) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}
for (const e of aristas) {
  const a = nodos[idx[e.origen]], b = nodos[idx[e.destino]];
  svg.appendChild(el('line', { class: 'edge', x1: a.x, y1: a.y, x2: b.x, y2: b.y }));
  if (e.peso != null) {
    const t = el('text', { class: 'edge-label', x: (a.x+b.x)/2, y: (a.y+b.y)/2 });
    t.textContent = e.peso; svg.appendChild(t);
  }
}
for (const n of nodos) {
  const g = el('g', { class: 'node' });
  g.appendChild(el('circle', { cx: n.x, cy: n.y, r: 26 }));
  const t = el('text', { x: n.x, y: n.y }); t.textContent = n.label || n.id;
  g.appendChild(t); svg.appendChild(g);
}
</script>
</body>
</html>`
}

// --- Skill plantilla: SKILL.md ---
export function generarSkillMD(datos = {}) {
  return datos.contenido_skill || `# ${datos.nombre_skill || 'skill'}\n`
}

// --- Onboarding: markdown "por dónde empezar" ---
export function generarOnboardingMD(datos = {}) {
  return datos.contenido || '# Onboarding\n'
}

// Escapa texto para incrustarlo seguro en HTML.
function escaparHTML(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Dispara la descarga de un archivo en el navegador.
export function descargar(nombre, contenido, mime = 'text/plain') {
  const blob = new Blob([contenido], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
