// useRecentlyChanged · devuelve true durante 1,5 s cuando la versión cambia después del montaje inicial (sección 16.6)
// conecta con: filas y celdas que muestran cambios en vivo (clase is-recently-changed)
import { useEffect, useRef, useState } from 'react'

const HIGHLIGHT_DURATION_MS = 1500

export const useRecentlyChanged = (key: string, version?: string | null): boolean => {
  const prevKeyRef = useRef<string>(key)
  const prevVersionRef = useRef<string | null | undefined>(version)
  const [highlighted, setHighlighted] = useState(false)

  useEffect(() => {
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key
      prevVersionRef.current = version
      setHighlighted(false)
      return
    }

    if (
      version &&
      prevVersionRef.current !== undefined &&
      prevVersionRef.current !== null &&
      prevVersionRef.current !== version
    ) {
      prevVersionRef.current = version
      setHighlighted(true)
      const timer = setTimeout(() => {
        setHighlighted(false)
      }, HIGHLIGHT_DURATION_MS)
      return () => clearTimeout(timer)
    }

    prevVersionRef.current = version
  }, [key, version])

  return highlighted
}

