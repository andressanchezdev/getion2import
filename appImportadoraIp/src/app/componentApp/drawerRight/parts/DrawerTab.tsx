// DrawerTab · pestaña lateral con el contador del carrito cuando el panel está contraído
// conecta con: DrawerRight (le pasa el ícono, el conteo y la acción de volver a abrir)
import React from 'react'
import './DrawerTab.css'

interface DrawerTabProps {
  icon: string
  count: number
  onOpen: () => void
}

export const DrawerTab: React.FC<DrawerTabProps> = ({ icon, count, onOpen }) => {
  return (
    <button type="button" onClick={onOpen} className="drawer-tab" aria-label={`Abrir carrito (${count} artículos)`}>
      <img src={icon} alt="" className="drawer-tab-icon" />
      {count > 0 && <span className="drawer-tab-count">{count}</span>}
    </button>
  )
}

export default DrawerTab
