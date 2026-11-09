// SideMenu · menú lateral: marca, lista de módulos con sus subgestiones y, abajo, el estado de la API y el usuario
// conecta con: navigation (MENU_ITEMS y acciones del estado ui, incluido sidebarOpen); partes: SideMenuBrand, SideMenuItem, ApiStatus y SideMenuUser
// ojo: con mouse el menú se abre al pasar el cursor y se contrae al salir (useSideMenuHover, como Grandma's); en pantallas táctiles se contrae a 64 px (solo íconos) y se cierra con la ✕ de su cabecera (SideMenuBrand); elegir un módulo con el menú contraído lo vuelve a abrir
import React from 'react'
import './SideMenu.css'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { setActiveModule, setActiveSubitem, setSidebarOpen, toggleSidebar, type ERPModule } from '@/features/navigation'
import { useFilteredMenuItems } from '@/global/hooks/access/usePermissions'
import { SideMenuBrand } from './brand/SideMenuBrand'
import { SideMenuItem } from './item/SideMenuItem'
import { ApiStatus } from './footer/ApiStatus'
import { SideMenuUser } from './footer/SideMenuUser'
import { useSideMenuHover } from './useSideMenuHover'

export const SideMenu: React.FC = () => {
    const dispatch = useAppDispatch()
    const { activeModule, activeSubitem, sidebarOpen } = useAppSelector((state) => state.ui)
    const menuItems = useFilteredMenuItems()
    const { hoverMode, hovered, hoverHandlers } = useSideMenuHover()
    // con mouse: contraído y se abre al pasar el cursor (como Grandma's); sin mouse: se cierra con la ✕ de su cabecera y se abre eligiendo un módulo
    const isMini = hoverMode ? !hovered : !sidebarOpen

    // elegir un módulo con el menú contraído también lo abre (así se ven sus subgestiones)
    const handleSelectModule = (id: ERPModule) => {
        dispatch(setActiveModule(id))
        if (isMini && !hoverMode) dispatch(setSidebarOpen(true))
    }

    return (
        <aside className={`side-menu ${isMini ? 'side-menu-mini' : ''}`} {...hoverHandlers}>
            <SideMenuBrand isMini={isMini} showToggle={!hoverMode} onToggle={() => dispatch(toggleSidebar())} />

            {/* Lista de Navegación de los Módulos */}
            <nav className="side-menu-nav" aria-label="Módulos">
                {menuItems.map((item) => (
                    <SideMenuItem
                        key={item.id}
                        item={item}
                        isActive={activeModule === item.id}
                        isMini={isMini}
                        activeSubitem={activeSubitem}
                        onSelectModule={handleSelectModule}
                        onSelectSubitem={(id) => dispatch(setActiveSubitem(id))}
                    />
                ))}
            </nav>

            {/* Pie: estado de la API y usuario */}
            <div className="side-menu-footer">
                <ApiStatus isMini={isMini} />
                <SideMenuUser isMini={isMini} />
            </div>
        </aside>
    )
}

export default SideMenu
