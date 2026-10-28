// SideMenuSubitems · lista de subgestiones de un módulo; se despliega animando su altura cuando el módulo está activo
// conecta con: SideMenuItem (subitems, si está abierta y cuál está activo); el id de cada subgestión sale de navigation
// ojo: antes cada subgestión se pintaba con "• " de texto y luego con un punto de estilo; como en la maqueta ahora la activa va en azul y no lleva punto
import React from 'react'
import type { NavSubitem } from '@/features/navigation'
import './SideMenuSubitems.css'

interface SideMenuSubitemsProps {
    subitems: NavSubitem[]
    isOpen: boolean
    activeSubitem: string
    onSelect: (id: string) => void
}

export const SideMenuSubitems: React.FC<SideMenuSubitemsProps> = ({ subitems, isOpen, activeSubitem, onSelect }) => {
    return (
        <div className={`side-menu-subitems ${isOpen ? 'side-menu-subitems-open' : ''}`}>
            <div className="side-menu-subitems-inner">
                {subitems.map((sub) => {
                    const isSubActive = activeSubitem === sub.id
                    return (
                        <button
                            type="button"
                            key={sub.id}
                            onClick={() => onSelect(sub.id)}
                            className={`side-menu-subitem-btn ${isSubActive ? 'side-menu-subitem-btn-active' : ''}`}
                            aria-current={isSubActive ? 'page' : undefined}
                            tabIndex={isOpen ? 0 : -1}
                        >
                            {sub.label}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default SideMenuSubitems
