// AppHeader · barra superior: logo con el nombre del sistema y el selector de bodega
// conecta con: WarehouseSelector (bodega activa); ojo: el estado de la API (latencia) ahora se muestra en el footer del menú (ApiStatus)
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
            {/* Logo y Nombre del Sistema */}
            <div className="app-header-brand">
                <div className="app-header-logo">IP</div>
                <div>
                    <h1 className="app-header-title">Importadora Premium</h1>
                    <span className="app-header-badge">ERP Online</span>
                </div>
            </div>

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
