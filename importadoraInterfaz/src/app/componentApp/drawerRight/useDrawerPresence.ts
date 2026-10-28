// useDrawerPresence · deja el panel montado mientras se cierra, para que se pueda ver la animación de salida
// conecta con: DrawerRight; recibe el modo actual (o null) y devuelve qué modo mostrar, si está montado y si está abierto
import { useEffect, useState } from 'react'
import type { DrawerMode } from './drawerRegistry'

const EXIT_DELAY_MS = 260 // igual a --duration-enter de tokens.css

export const useDrawerPresence = (mode: DrawerMode | null) => {
  // último modo no nulo: así el contenido sigue visible mientras el panel se cierra
  const [lastMode, setLastMode] = useState<DrawerMode | null>(mode)
  if (mode && mode !== lastMode) setLastMode(mode)

  // el panel se monta con el modo y se desmonta al terminar la animación de salida
  const [isSettled, setIsSettled] = useState(Boolean(mode))
  useEffect(() => {
    const timer = setTimeout(() => setIsSettled(Boolean(mode)), mode ? 0 : EXIT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [mode])

  return {
    shownMode: lastMode,
    isMounted: Boolean(mode) || isSettled,
    isOpen: Boolean(mode) && isSettled,
  }
}
