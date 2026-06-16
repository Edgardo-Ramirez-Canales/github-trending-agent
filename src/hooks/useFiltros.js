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

const DEFAULTS = {
  modo: 'trending', // 'trending' | 'usuario' | 'repo'

  // --- servidor ---
  fecha: { preset: '', desde: '', hasta: '' },
  pushedDesde: '',
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
}

// Campos transitorios que no se persisten.
const NO_PERSISTIR = ['urlRepo']

function cargarIniciales() {
  const guardado = getFiltros()
  if (!guardado || typeof guardado !== 'object') return { ...DEFAULTS }
  // Merge defensivo: si en el futuro se agregan campos, los faltantes toman default.
  return {
    ...DEFAULTS,
    ...guardado,
    fecha: { ...DEFAULTS.fecha, ...(guardado.fecha || {}) },
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
  const setModo = useCallback((modo) => {
    setFiltrosState((prev) => ({ ...prev, modo }))
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
      busqueda: busqueda.trim(),
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
