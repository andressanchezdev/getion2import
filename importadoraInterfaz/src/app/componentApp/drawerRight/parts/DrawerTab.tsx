// DrawerTab · pestaña lateral con el contador del carrito cuando el panel está contraído; se puede arrastrar hacia arriba y abajo
// conecta con: DrawerRight (le pasa el ícono, el conteo y la acción de volver a abrir); global useVerticalDrag (arrastre y posición guardada)
// ojo: solo se mueve en vertical y siempre queda pegada al borde derecho; un clic sin arrastre abre el carrito
import React from 'react'
import './DrawerTab.css'
import { useVerticalDrag } from '@/global/hooks/useVerticalDrag'

interface DrawerTabProps {
  icon: string
  count: number
  onOpen: () => void
}

export const DrawerTab: React.FC<DrawerTabProps> = ({ icon, count, onOpen }) => {
  const { ref, top, isDragging, handlers } = useVerticalDrag('ip_cart_tab_top')

  return (
    <button
      type="button"
      ref={ref}
      onClick={onOpen}
      className={`drawer-tab ${isDragging ? 'drawer-tab-dragging' : ''}`}
      style={top === null ? undefined : { top }}
      aria-label={`Abrir carrito (${count} artículos). Arrastra o usa las flechas arriba y abajo para moverlo`}
      title="Abrir carrito · arrástralo para moverlo"
      {...handlers}
    >
      <img src={icon} alt="" className="drawer-tab-icon" draggable={false} />
      {count > 0 && <span className="drawer-tab-count">{count}</span>}
    </button>
  )
}

export default DrawerTab
