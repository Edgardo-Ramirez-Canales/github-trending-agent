import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { getFiltros, setFiltros as persistirFiltros } from '../utils/storage.js'
import { useDebouncedValue } from './useDebouncedValue.js'

// Estado centralizado de los filtros del listado de repos (Fase 3).
//
// Separa explícitamente dos familias de filtros:
//   - SERVIDOR: cambian la pregunta a GitHub → disparan re-fetch.
//     (modo, fecha, pushedDesde, usuario, urlRepo, lenguaje único, sort, order,
//      incluirVistos, y la búsqueda de texto libre derivada de keyword)
//   - CLIENTE: solo recortan/ordenan lo ya traído, sin volver a GitHub.
//     (minEstrellas, maxEstrellas, velocidadMin, soloOriginales, lenguajes multi,
//      orden visual)
//
// `keyword` es de servidor pero se debouncea antes de entrar a filtrosServidor
// para no disparar un fetch por cada tecla.
//
// `filtrosServidor` se memoiza para pasarlo tal cual a useTrendingRepos sin
// provocar re-fetch en cada tecleo de los filtros de cliente.
//
// Persistencia: se guarda en localStorage (gta_filtros) salvo los campos
// transitorios de búsqueda directa (urlRepo) que no tiene sentido recordar.

// Fecha ISO de "hace N días" (para el default de actividad reciente).
function haceDias(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const DEFAULTS = {
  modo: 'trending', // 'trending' | 'usuario' | 'repo'

  // --- servidor ---
  // Proxy de "tendencia a crecer" (barato): ventana corta + actividad reciente.
  //   created:>= mes actual  → solo repos JÓVENES (descarta viejos-famosos)
  //   pushed:>= últimos 30d   → solo repos VIVOS (descarta abandonados)
  // Combinado con orden por velocidad (★/día) aproxima el momentum sin snapshots.
  fecha: { preset: 'mesActual', desde: '', hasta: '' },
  pushedDesde: haceDias(30),
  usuario: '',
  urlRepo: '',
  lenguaje: '', // lenguaje único a nivel query (opcional)
  sort: 'stars',
  order: 'desc',
  incluirVistos: false,

  // --- cliente ---
  minEstrellas: 100, // slider que recorta encima del piso del servidor
  maxEstrellas: null,
  velocidadMin: 0, // ★/día mínimas (dato calculado en cliente)
  soloOriginales: false, // ocultar forks (útil en modo usuario)
  lenguajes: [], // multi-select que filtra en pantalla
  keyword: '',
  orden: 'velocidad', // orden visual: 'velocidad' | 'estrellas' | 'fecha'
  ordenDir: 'desc', // dirección del orden visual: 'desc' | 'asc' (solo modo usuario)
}

// Campos transitorios que no se persisten.
// pushedDesde es una fecha ABSOLUTA: si se persistiera, se congelaría y al día
// siguiente desincronizaría el radio "Actualizado". Se recalcula fresco cada
// sesión desde DEFAULTS (el usuario igual puede cambiarlo en la barra).
const NO_PERSISTIR = ['urlRepo', 'pushedDesde']

function cargarIniciales() {
  const guardado = getFiltros()
  if (!guardado || typeof guardado !== 'object') return { ...DEFAULTS }
  // Los campos transitorios nunca se toman de localStorage (pushedDesde guardado
  // viejo pisaría el default fresco). Se descartan antes del merge.
  const limpio = { ...guardado }
  for (const k of NO_PERSISTIR) delete limpio[k]
  // Merge defensivo: si en el futuro se agregan campos, los faltantes toman default.
  return {
    ...DEFAULTS,
    ...limpio,
    fecha: { ...DEFAULTS.fecha, ...(limpio.fecha || {}) },
  }
}

export function useFiltros() {
  const [filtros, setFiltrosState] = useState(cargarIniciales)

  // Keyword → búsqueda de servidor: se difiere para no consultar GitHub en cada tecla.
  const busqueda = useDebouncedValue(filtros.keyword, 450)

  // Persistir (omitiendo campos transitorios) cada vez que cambian.
  const primera = useRef(true)
  useEffect(() => {
    if (primera.current) {
      primera.current = false
      return
    }
    const aGuardar = { ...filtros }
    for (const k of NO_PERSISTIR) delete aGuardar[k]
    persistirFiltros(aGuardar)
  }, [filtros])

  // Setter genérico de un campo.
  const setFiltro = useCallback((clave, valor) => {
    setFiltrosState((prev) => ({ ...prev, [clave]: valor }))
  }, [])

  // Setter del sub-objeto fecha (merge parcial).
  const setFecha = useCallback((parcial) => {
    setFiltrosState((prev) => ({ ...prev, fecha: { ...prev.fecha, ...parcial } }))
  }, [])

  // Toggle de un lenguaje en el multi-select de cliente.
  const toggleLenguaje = useCallback((l) => {
    setFiltrosState((prev) => ({
      ...prev,
      lenguajes: prev.lenguajes.includes(l)
        ? prev.lenguajes.filter((x) => x !== l)
        : [...prev.lenguajes, l],
    }))
  }, [])

  // Cambiar de modo limpiando lo específico del modo anterior.
  // Al entrar a 'usuario' reseteamos los filtros heredados de trending
  // (fecha → created:>=, lenguaje → language:, pushedDesde → pushed:>=, velocidad
  // → ★/día, soloOriginales y orden visual): en este modo queremos ver TODOS los
  // repos del usuario sin que esos filtros acoten la búsqueda y den "0 repos".
  const setModo = useCallback((modo) => {
    setFiltrosState((prev) => {
      if (modo === 'usuario') {
        return {
          ...prev,
          modo,
          fecha: { ...DEFAULTS.fecha },
          lenguaje: DEFAULTS.lenguaje,
          lenguajes: [...DEFAULTS.lenguajes],
          pushedDesde: DEFAULTS.pushedDesde,
          velocidadMin: DEFAULTS.velocidadMin,
          soloOriginales: DEFAULTS.soloOriginales,
          orden: DEFAULTS.orden,
          ordenDir: DEFAULTS.ordenDir,
          keyword: DEFAULTS.keyword,
        }
      }
      return { ...prev, modo }
    })
  }, [])

  // Restablecer filtros a defaults conservando el modo activo.
  const limpiar = useCallback(() => {
    setFiltrosState((prev) => ({ ...DEFAULTS, modo: prev.modo }))
  }, [])

  // Subconjunto de SERVIDOR memoizado → alimenta a useTrendingRepos.
  // Solo cambia su identidad cuando cambia algún filtro de servidor.
  const filtrosServidor = useMemo(
    () => ({
      modo: filtros.modo,
      fecha: filtros.fecha,
      pushedDesde: filtros.pushedDesde,
      usuario: filtros.usuario,
      urlRepo: filtros.urlRepo,
      lenguaje: filtros.lenguaje,
      sort: filtros.sort,
      order: filtros.order,
      incluirVistos: filtros.incluirVistos,
      // La búsqueda de servidor solo aplica en trending. En modo usuario la
      // palabra clave filtra en cliente, así que no debe disparar re-fetch.
      busqueda: filtros.modo === 'trending' ? busqueda.trim() : '',
    }),
    [
      filtros.modo,
      filtros.fecha,
      filtros.pushedDesde,
      filtros.usuario,
      filtros.urlRepo,
      filtros.lenguaje,
      filtros.sort,
      filtros.order,
      filtros.incluirVistos,
      busqueda,
    ],
  )

  return {
    filtros,
    filtrosServidor,
    setFiltro,
    setFecha,
    setModo,
    toggleLenguaje,
    limpiar,
  }
}
