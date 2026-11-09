// useSideMenuHover · abre y cierra el menú lateral como el de Grandma's: con mouse queda contraído (solo íconos) y se abre al pasar el cursor; en pantallas táctiles se cierra con la ✕ de su cabecera
// conecta con: SideMenu (lo usa) y SideMenuBrand (oculta la ✕ cuando el menú se maneja con el cursor)
// ojo: «hover: hover y pointer: fine» es la misma consulta que usa Grandma's para saber si hay un mouse; si cambia (por ejemplo al acoplar un mouse) se vuelve a evaluar
import { useEffect, useState } from 'react'

const HOVER_QUERY = '(hover: hover) and (pointer: fine)'

export const useSideMenuHover = () => {
  const [hoverMode, setHoverMode] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(HOVER_QUERY).matches === true)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const query = window.matchMedia(HOVER_QUERY)
    const sync = () => {
      setHoverMode(query.matches)
      setHovered(false)
    }
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  return {
    hoverMode,
    hovered,
    hoverHandlers: hoverMode ? { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) } : {},
  }
}
