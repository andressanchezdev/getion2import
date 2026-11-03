// useDebouncedValue · devuelve el valor recién después de que dejó de cambiar durante `delayMs` (para no pedir al backend en cada tecla)
// conecta con: useProductsLoader (búsqueda por texto); sirve para cualquier campo que dispare una petición
import { useEffect, useState } from 'react'

export const useDebouncedValue = <T>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
