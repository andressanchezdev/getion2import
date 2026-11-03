// SideMenuBrand · cabecera del menú lateral: logo con las iniciales, nombre y el botón para contraer o expandir el menú (con el menú contraído solo se ve el botón)
// conecta con: SideMenu (le pasa si el menú está contraído y la acción de alternarlo)
// ojo: antes la marca vivía en AppHeader y el botón ☰ estaba en la cabecera de la columna central; ahora el botón vive aquí, en la cabecera del menú
import React from 'react'
import ipLogo from '@/assets/logos/ip-logo.svg'
import './SideMenuBrand.css'

interface SideMenuBrandProps {
    isMini: boolean
    showToggle: boolean // false cuando el menú se abre con el cursor (no hace falta el botón)
    onToggle: () => void
}

export const SideMenuBrand: React.FC<SideMenuBrandProps> = ({ isMini, showToggle, onToggle }) => {
    const label = isMini ? 'Expandir menú' : 'Contraer menú'

    return (
        <div className={`side-menu-brand ${isMini ? 'side-menu-brand-mini' : ''}`} title="Importadora Premium">
            <img src={ipLogo} alt="Importadora Premium" className="side-menu-brand-logo" />
            {!isMini && <b className="side-menu-brand-name">Importadora Premium</b>}
            {showToggle && (
                <button type="button" className="side-menu-brand-toggle" onClick={onToggle} aria-label={label} aria-expanded={!isMini} title={label}>
                    ☰
                </button>
            )}
        </div>
    )
}

export default SideMenuBrand
