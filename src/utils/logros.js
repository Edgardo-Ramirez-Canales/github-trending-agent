// Cálculo de estadísticas y logros a partir de las contribuciones del usuario.
// No toca red ni storage: solo deriva números de la lista que ya carga
// useContributions desde Supabase (tabla `contribuciones`).

// Resumen numérico de las contribuciones.
export function calcularStats(contribuciones = []) {
  const por = { aceptado: 0, rechazado: 0, abierto: 0, cancelado: 0 }
  const repos = new Set()
  let prs = 0
  let issues = 0

  for (const c of contribuciones) {
    if (por[c.estado] !== undefined) por[c.estado] += 1
    else por.abierto += 1 // estado desconocido: lo tratamos como en curso
    if (c.repo) repos.add(c.repo)
    if (c.modo === 'B' || c.url_issue) issues += 1
    else if (c.modo === 'C' || c.url_pr) prs += 1
  }

  const total = contribuciones.length
  const cerrados = por.aceptado + por.rechazado
  const tasaAceptacion = cerrados
    ? Math.round((por.aceptado / cerrados) * 100)
    : 0

  return {
    total,
    ...por,
    cerrados,
    reposUnicos: repos.size,
    prs,
    issues,
    tasaAceptacion,
  }
}

// Contribuciones agrupadas en N cubos temporales (de más antiguo a más reciente).
// `unidad`: 'dia' | 'semana' | 'mes'. Devuelve [{ inicio: Date, total: number }]
// para alimentar el sparkline. Días/semanas usan ventana fija; meses usan mes
// calendario (más fiel a las etiquetas que mostramos).
export function calcularActividad(contribuciones = [], unidad = 'semana', cantidad = 8) {
  if (unidad === 'mes') {
    const hoy = new Date()
    const buckets = Array.from({ length: cantidad }, (_, i) => ({
      inicio: new Date(hoy.getFullYear(), hoy.getMonth() - (cantidad - 1 - i), 1),
      total: 0,
    }))
    const finUltimo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1)
    for (const c of contribuciones) {
      const t = new Date(c.fecha_creacion)
      if (Number.isNaN(t.getTime()) || t < buckets[0].inicio || t >= finUltimo) {
        continue
      }
      for (let i = cantidad - 1; i >= 0; i--) {
        if (t >= buckets[i].inicio) {
          buckets[i].total += 1
          break
        }
      }
    }
    return buckets
  }

  const MS = (unidad === 'dia' ? 1 : 7) * 86_400_000
  const ahora = Date.now()
  const buckets = Array.from({ length: cantidad }, (_, i) => ({
    inicio: new Date(ahora - (cantidad - 1 - i) * MS),
    total: 0,
  }))
  const corte = ahora - cantidad * MS
  for (const c of contribuciones) {
    const t = new Date(c.fecha_creacion).getTime()
    if (Number.isNaN(t) || t < corte) continue
    const idx = cantidad - 1 - Math.floor((ahora - t) / MS)
    if (idx >= 0 && idx < cantidad) buckets[idx].total += 1
  }
  return buckets
}

// Conteo de TODAS las categorías de acción usadas, ordenado de mayor a menor.
// Cada contribución guarda un array `categorias` de claves; se suma +1 por
// aparición. Devuelve [{ clave, label, total, chip }] solo de las usadas
// (total > 0). Recibe META_POR_CLAVE para traducir clave → label/colores.
export function calcularCategorias(contribuciones = [], metaPorClave = {}) {
  const conteo = {}
  for (const c of contribuciones) {
    for (const clave of c.categorias ?? []) {
      conteo[clave] = (conteo[clave] ?? 0) + 1
    }
  }
  return Object.entries(conteo)
    .map(([clave, total]) => ({
      clave,
      total,
      label: metaPorClave[clave]?.label ?? clave,
      chip: metaPorClave[clave]?.chip ?? 'bg-white/[0.06] text-[#8a8f98]',
    }))
    .sort((a, b) => b.total - a.total)
}

// Categoría de acción más usada (label + conteo), derivada de calcularCategorias.
export function calcularTopCategoria(contribuciones = [], metaPorClave = {}) {
  return calcularCategorias(contribuciones, metaPorClave)[0] ?? null
}

// Lista de logros con su estado conseguido/bloqueado, derivada de los stats.
export function calcularLogros(stats) {
  const { total, aceptado, reposUnicos, cerrados, tasaAceptacion } = stats
  return [
    {
      id: 'primer',
      label: 'Primer aporte',
      desc: 'Hiciste tu primera contribución',
      conseguido: total >= 1,
    },
    {
      id: 'cinco',
      label: '5 aportes',
      desc: 'Llegaste a 5 contribuciones',
      conseguido: total >= 5,
    },
    {
      id: 'diez',
      label: '10 aportes',
      desc: 'Llegaste a 10 contribuciones',
      conseguido: total >= 10,
    },
    {
      id: 'aceptado',
      label: 'PR aceptado',
      desc: 'Te fusionaron un Pull Request',
      conseguido: aceptado >= 1,
    },
    {
      id: 'multirepo',
      label: 'Multi-repo',
      desc: 'Aportaste en 3 repos distintos',
      conseguido: reposUnicos >= 3,
    },
    {
      id: 'certero',
      label: 'Certero',
      desc: 'Tasa de aceptación ≥ 70%',
      conseguido: cerrados >= 3 && tasaAceptacion >= 70,
    },
  ]
}
