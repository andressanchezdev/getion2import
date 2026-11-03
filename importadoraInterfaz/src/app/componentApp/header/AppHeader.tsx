// AppHeader · controles a la derecha del título: selector de compañía (superadmin) y selector de bodega (solo en Tienda)
import React from 'react'
import './AppHeader.css'
import { useAppSelector } from '@/global/hooks/store/useRedux'
import { CompanySelector } from './company/CompanySelector'
import { WarehouseSelector } from './warehouse/WarehouseSelector'

export const AppHeader: React.FC = () => {
  const { activeModule, activeSubitem } = useAppSelector((state) => state.ui)

  return (
    <div className="app-header-actions">
      {/* Salto de compañía: solo para superadmin */}
      <CompanySelector />
      {/* Selector de bodega en cabecera: únicamente dentro del catálogo de Tienda, nunca en Gestión Ventas */}
      {activeModule === 'shop' && (activeSubitem === 'catalog' || !activeSubitem) && <WarehouseSelector />}
    </div>
  )
}

export default AppHeader
