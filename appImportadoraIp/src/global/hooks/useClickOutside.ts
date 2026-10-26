// useClickOutside · ejecuta una función cuando se hace clic fuera del elemento o se presiona Escape
// conecta con: dropdowns y menús flotantes (hoy AppHeader tiene su propia copia, se migra después)
import { useEffect, type RefObject } from 'react'

// solo escucha mientras isActive sea true (por ejemplo, mientras el menú está abierto)
export const useClickOutside = (
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  isActive: boolean
) => {
  useEffect(() => {
    if (!isActive) return

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [ref, onClose, isActive])
}
