// AppHeader · controles a la derecha del título: selector de compañía (superadmin), selector de bodega (solo en Tienda), pastilla de estado de caja (solo en Caja) y notificaciones
import React from 'react'
import './AppHeader.css'
import { useAppSelector } from '@/global/hooks/store/useRedux'
import { Pill } from '@/global/components/UI/atoms/Pill'
import { CompanySelector } from './company/CompanySelector'
import { WarehouseSelector } from './warehouse/WarehouseSelector'
import { NotificationsPopover } from '@/features/notifications'

export const AppHeader: React.FC = () => {
  const { activeModule, activeSubitem, activeWarehouseId } = useAppSelector((state) => state.ui)
  const cash = useAppSelector((state) => state.cash)
  const isCashRegisterView = activeModule === 'shop' && activeSubitem === 'cashRegister'
  const isCurrentWh = cash.warehouseId === (Number(activeWarehouseId) || 0)
  const isShiftOpen = isCurrentWh && cash.session?.status === 'open'

  return (
    <div className="app-header-actions">
      {/* Salto de compañía: solo para superadmin */}
      <CompanySelector />
      {/* Selector de bodega en cabecera: únicamente dentro del catálogo de Tienda, nunca en Gestión Ventas */}
      {activeModule === 'shop' && (activeSubitem === 'catalog' || !activeSubitem) && <WarehouseSelector />}
      {/* Indicador de estado de turno: exclusivo de la vista de Caja, a nivel del icono de notificaciones */}
      {isCashRegisterView && (
        <Pill tone={isShiftOpen ? 'green' : 'amber'}>
          {isShiftOpen ? 'Turno abierto' : 'Turno cerrado'}
        </Pill>
      )}
      {/* Notificaciones del usuario */}
      <NotificationsPopover />
    </div>
  )
}

export default AppHeader
