// SideMenuBrand · cabecera del menú lateral: logo, nombre y, en pantallas táctiles con el menú abierto, la ✕ para cerrarlo (con el menú contraído no hay botón: se abre eligiendo un módulo)
// conecta con: SideMenu (le pasa si el menú está contraído y la acción de alternarlo)
// ojo: antes la marca vivía en AppHeader y el botón ☰ estaba en la cabecera de la columna central; ahora vive aquí, en la cabecera del menú, y es una ✕ que solo aparece con el menú abierto
import React from 'react'
import ipLogo from '@/assets/logos/ip-logo.svg'
import './SideMenuBrand.css'

interface SideMenuBrandProps {
    isMini: boolean
    showToggle: boolean // false cuando el menú se abre con el cursor (no hace falta la ✕)
    onToggle: () => void
}

export const SideMenuBrand: React.FC<SideMenuBrandProps> = ({ isMini, showToggle, onToggle }) => {
    return (
        <div className={`side-menu-brand ${isMini ? 'side-menu-brand-mini' : ''}`} title="Importadora Premium">
            <img src={ipLogo} alt="Importadora Premium" className="side-menu-brand-logo" />
            {!isMini && <b className="side-menu-brand-name">Importadora Premium</b>}
            {showToggle && !isMini && (
                <button type="button" className="side-menu-brand-toggle" onClick={onToggle} aria-label="Cerrar menú" title="Cerrar menú">
                    ✕
                </button>
            )}
        </div>
    )
}

export default SideMenuBrand
