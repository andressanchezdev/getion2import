// DrawerHeader · encabezado único del panel derecho: botón cerrar a la izquierda (al límite con contentMain), ícono, título, detalle y menú opcional
// conecta con: DrawerRight (le pasa el ícono, los textos de la feature, la acción de cerrar y, si el panel tiene opciones, el menú)
// ojo: el botón de cierre se ubica al pie izquierdo del drawer; el panel también se cierra con clic fuera o Esc
import React, { useRef, useState } from 'react'
import { useClickOutside } from '@/global/hooks/ui/useClickOutside'
import type { DrawerMenuAction } from '@/global/types/drawerMenu.types'
import type { DrawerMeta } from '../drawerRegistry'
import './DrawerHeader.css'

interface DrawerHeaderProps {
  icon: string
  meta: DrawerMeta
  onClose: () => void
  menu?: DrawerMenuAction[]
}

export const DrawerHeader: React.FC<DrawerHeaderProps> = ({ icon, meta, onClose, menu }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  useClickOutside(menuRef, () => setMenuOpen(false), menuOpen)

  return (
    <header className="drawer-header">
      <button
        type="button"
        onClick={onClose}
        className="drawer-header-close"
        aria-label="Cerrar panel"
        title="Cerrar panel (Esc)"
      >
        ✕
      </button>

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

      {menu && (
        <div className="drawer-header-actions">
          <div className="drawer-header-menu" ref={menuRef}>
            <button
              type="button"
              className="drawer-header-menu-btn"
              aria-label="Opciones del carrito"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title="Opciones"
              onClick={() => setMenuOpen((open) => !open)}
            >
              ☰
            </button>
            {menuOpen && (
              <div className="drawer-header-menu-list" role="menu">
                {menu.map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    role="menuitem"
                    className={`drawer-header-menu-item ${action.danger ? 'drawer-header-menu-item-danger' : ''}`}
                    disabled={action.disabled}
                    onClick={() => {
                      setMenuOpen(false)
                      action.onClick()
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

export default DrawerHeader
