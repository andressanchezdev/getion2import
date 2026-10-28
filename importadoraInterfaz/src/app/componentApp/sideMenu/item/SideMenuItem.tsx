// SideMenuItem · un módulo del menú (ícono, nombre, insignia y flecha) con sus subgestiones debajo
// conecta con: SideMenu (le pasa el módulo y recibe los clics), SideMenuSubitems (la lista que se despliega)
// ojo: id va en inglés (código) y label en español; las opciones del menú no cambian, solo su diseño (el de la maqueta: flecha ▸ ▾, sin bloque oscuro)
import React from 'react'
import type { ERPModule, NavItem } from '@/features/navigation'
import { SideMenuSubitems } from './SideMenuSubitems'
import './SideMenuItem.css'

interface SideMenuItemProps {
    item: NavItem
    isActive: boolean
    isMini: boolean
    activeSubitem: string
    onSelectModule: (id: ERPModule) => void
    onSelectSubitem: (id: string) => void
}

export const SideMenuItem: React.FC<SideMenuItemProps> = ({
    item,
    isActive,
    isMini,
    activeSubitem,
    onSelectModule,
    onSelectSubitem,
}) => {
    return (
        <div className="side-menu-item-group">
            <button
                type="button"
                onClick={() => onSelectModule(item.id)}
                className={`side-menu-item-btn ${isMini ? 'side-menu-item-btn-mini' : ''}`}
                aria-expanded={isMini ? undefined : isActive}
                aria-current={isActive ? 'page' : undefined}
                title={isMini ? item.label : undefined}
            >
                <img src={item.icon} alt="" className="side-menu-item-icon" />
                <span className="side-menu-item-label">{item.label}</span>
                {Boolean(item.badgeCount && item.badgeCount > 0) && (
                    <span className="side-menu-item-badge">{item.badgeCount}</span>
                )}
                <span className="side-menu-item-caret" aria-hidden="true">
                    {isActive ? '▾' : '▸'}
                </span>
            </button>

            {/* Submenú del módulo (se despliega solo en el módulo activo y con el menú abierto) */}
            <SideMenuSubitems
                subitems={item.subitems}
                isOpen={isActive && !isMini}
                activeSubitem={activeSubitem}
                onSelect={onSelectSubitem}
            />
        </div>
    )
}

export default SideMenuItem
