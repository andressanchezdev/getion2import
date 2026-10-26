// SideMenuItem · un módulo del menú (ícono, nombre, insignia y flecha) con sus subgestiones debajo
// conecta con: SideMenu (le pasa el módulo y recibe los clics), SideMenuSubitems (la lista que se despliega)
import React from 'react'
import type { ERPModule, NavItem } from '@/features/navigation'
import { SideMenuSubitems } from './SideMenuSubitems'
import './SideMenuItem.css'

interface SideMenuItemProps {
    item: NavItem
    isActive: boolean
    activeSubitem: string
    onSelectModule: (id: ERPModule) => void
    onSelectSubitem: (id: string) => void
}

export const SideMenuItem: React.FC<SideMenuItemProps> = ({
    item,
    isActive,
    activeSubitem,
    onSelectModule,
    onSelectSubitem,
}) => {
    return (
        <div className="side-menu-item-group">
            <button
                type="button"
                onClick={() => onSelectModule(item.id)}
                className={`side-menu-item-btn ${isActive ? 'side-menu-item-btn-active' : 'side-menu-item-btn-inactive'}`}
                aria-expanded={isActive}
                aria-current={isActive ? 'page' : undefined}
            >
                <span className="side-menu-item-icon-box">
                    <img src={item.icon} alt="" className="side-menu-item-icon" />
                </span>
                <span className="side-menu-item-label">{item.label}</span>
                {Boolean(item.badgeCount && item.badgeCount > 0) && (
                    <span className="side-menu-item-badge">{item.badgeCount}</span>
                )}
                <svg
                    className="side-menu-item-chevron"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <polyline points="9 6 15 12 9 18" />
                </svg>
            </button>

            {/* Submenú del módulo (se despliega solo en el módulo activo) */}
            <SideMenuSubitems
                subitems={item.subitems}
                isOpen={isActive}
                activeSubitem={activeSubitem}
                onSelect={onSelectSubitem}
            />
        </div>
    )
}

export default SideMenuItem
