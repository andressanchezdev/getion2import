// AppHeader · barra superior de la columna central: selector de bodega, configuración y botón de acciones
import React from 'react'
import './AppHeader.css'
import { WarehouseSelector } from './warehouse/WarehouseSelector'
import { useAppDispatch } from '@/global/hooks/useRedux'
import { setActiveModule, setActiveSubitem, toggleRightDrawer } from '@/features/navigation'
import settingsIcon from '@/assets/icons/settings.svg'

export const AppHeader: React.FC = () => {
    const dispatch = useAppDispatch()

    return (
        <header className="app-header">
            {/* Controles y Acciones a la derecha */}
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

                {/* Botón Hamburguesa Superior Derecho de Acciones (DrawerRight) */}
                <button
                    type="button"
                    className="app-header-actions-btn"
                    onClick={() => dispatch(toggleRightDrawer())}
                    title="Opciones y Acciones del Proceso Activo"
                    aria-label="Opciones y Acciones del Proceso Activo"
                >
                    <span className="app-header-actions-burger" aria-hidden="true">☰</span>
                    <span className="app-header-actions-label">Acciones</span>
                </button>
            </div>
        </header>
    )
}

export default AppHeader
