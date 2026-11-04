// DrawerTab · pestaña lateral con contador para paneles contraídos (carrito, traslados en borrador); arrastrable en vertical
// conecta con: DrawerRight; global useVerticalDrag (arrastre y posición guardada)
import React from 'react'
import './DrawerTab.css'
import { useVerticalDrag } from '@/global/hooks/ui/useVerticalDrag'

export interface DrawerTabHandlers {
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void
  onPointerMove: (event: React.PointerEvent<HTMLButtonElement>) => void
  onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => void
  onPointerCancel: (event: React.PointerEvent<HTMLButtonElement>) => void
  onClickCapture: (event: React.MouseEvent<HTMLButtonElement>) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void
}

interface DrawerTabProps {
  icon: string
  count: number
  onOpen: () => void
  label?: string
  title?: string
  storageKey?: string
  className?: string
  controlledTop?: number | null
  controlledRight?: number | string
  isDragging?: boolean
  handlers?: DrawerTabHandlers
  innerRef?: React.RefObject<HTMLButtonElement | null>
}

export const DrawerTab: React.FC<DrawerTabProps> = ({
  icon,
  count,
  onOpen,
  label = 'carrito',
  title,
  storageKey = 'ip_cart_tab_top',
  className = '',
  controlledTop,
  controlledRight,
  isDragging: controlledIsDragging,
  handlers: controlledHandlers,
  innerRef,
}) => {
  const internal = useVerticalDrag(storageKey)

  const effectiveRef = innerRef ?? internal.ref
  const effectiveTop = controlledTop !== undefined ? controlledTop : internal.top
  const effectiveIsDragging = controlledIsDragging !== undefined ? controlledIsDragging : internal.isDragging
  const effectiveHandlers = controlledHandlers ?? internal.handlers

  return (
    <button
      type="button"
      ref={effectiveRef}
      onClick={onOpen}
      className={`drawer-tab ${effectiveIsDragging ? 'drawer-tab-dragging' : ''} ${className}`}
      style={{
        ...(effectiveTop !== null && effectiveTop !== undefined ? { top: effectiveTop } : {}),
        ...(controlledRight !== undefined ? { right: controlledRight } : {}),
      }}
      aria-label={`Abrir ${label} (${count} artículos). Arrastra o usa las flechas arriba y abajo para moverlo`}
      title={title || `Abrir ${label} · arrástralo para moverlo`}
      {...effectiveHandlers}
    >
      <img src={icon} alt="" className="drawer-tab-icon" draggable={false} />
      {count > 0 && <span className="drawer-tab-count">{count}</span>}
    </button>
  )
}

export default DrawerTab
