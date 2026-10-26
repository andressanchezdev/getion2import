// useEscapeKey · ejecuta una función cuando se presiona Escape (solo mientras isActive sea true)
// conecta con: DrawerRight (cerrar el panel); para menús con clic fuera se usa useClickOutside
import { useEffect } from 'react'

export const useEscapeKey = (onEscape: () => void, isActive: boolean) => {
  useEffect(() => {
    if (!isActive) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscape()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onEscape, isActive])
}
