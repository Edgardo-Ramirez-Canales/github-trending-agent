import { useState, useEffect } from 'react'

// Devuelve `valor` con un retardo: solo se actualiza cuando deja de cambiar
// durante `ms`. Útil para no recalcular filtros en cada tecla.
export function useDebouncedValue(valor, ms = 250) {
  const [diferido, setDiferido] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setDiferido(valor), ms)
    return () => clearTimeout(t)
  }, [valor, ms])
  return diferido
}
