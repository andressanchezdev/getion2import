// DrawerHeader · encabezado único del panel derecho: ícono, título, detalle y botón cerrar
// conecta con: DrawerRight (le pasa el ícono, los textos de la feature y la acción de cerrar)
// ojo: antes cada feature (carrito y estado de cuenta) pintaba su propio encabezado
import React from 'react'
import type { DrawerMeta } from '../drawerRegistry'
import './DrawerHeader.css'

interface DrawerHeaderProps {
  icon: string
  meta: DrawerMeta
  onClose: () => void
}

export const DrawerHeader: React.FC<DrawerHeaderProps> = ({ icon, meta, onClose }) => {
  return (
    <header className="drawer-header">
      <div className="drawer-header-icon-col">
        <span className="drawer-header-icon-box">
          <img src={icon} alt="" className="drawer-header-icon" />
        </span>
        {meta.badge && <span className="drawer-header-badge">{meta.badge}</span>}
      </div>
      <div className="drawer-header-text">
        {meta.tag && <span className="drawer-header-tag">{meta.tag}</span>}
        <h3 className="drawer-header-title">{meta.title}</h3>
        {meta.subtitle && <span className="drawer-header-subtitle">{meta.subtitle}</span>}
      </div>
      <button type="button" onClick={onClose} className="drawer-header-close" aria-label="Cerrar panel" title="Cerrar panel (Esc)">
        ✕
      </button>
    </header>
  )
}

export default DrawerHeader
