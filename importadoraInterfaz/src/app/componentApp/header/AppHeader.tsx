// AppHeader · barra superior de la columna central: selector de bodega y configuración
// conecta con: WarehouseSelector (bodega activa), navigation (el módulo de Configuración); ojo: el estado de la API (latencia) se muestra en el footer del menú (ApiStatus)
// ojo: la marca (logo y nombre) y el botón ☰ de contraer el menú viven ahora en la cabecera del menú lateral (SideMenuBrand)
import React from 'react'
import './AppHeader.css'
import { WarehouseSelector } from './warehouse/WarehouseSelector'
import { useAppDispatch } from '@/global/hooks/useRedux'
import { setActiveModule, setActiveSubitem } from '@/features/navigation'
import settingsIcon from '@/assets/icons/settings.svg'

export const AppHeader: React.FC = () => {
    const dispatch = useAppDispatch()

    return (
        <header className="app-header">
            {/* Selector de Bodega Activa y Botón de Configuración */}
            <div className="app-header-actions">
                <WarehouseSelector />
                <button
                    type="button"
                    className="app-header-settings-btn"
                    onClick={() => {
                        dispatch(setActiveModule('settings'))
                        dispatch(setActiveSubitem('company'))
                    }}
                    title="Configuración del Sistema"
                    aria-label="Configuración del Sistema"
                >
                    <img src={settingsIcon} alt="" className="app-header-settings-icon" aria-hidden="true" />
                </button>
            </div>
        </header>
    )
}

export default AppHeader
