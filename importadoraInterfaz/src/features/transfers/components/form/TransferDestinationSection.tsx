// TransferDestinationSection · selección o visualización de sede de destino en la solicitud de traslado
import React from 'react'
import { Icon } from '@/global/components/UI/atoms/Icon'
import mapPinIcon from '@/assets/icons/map-pin.svg?raw'
import type { Warehouse } from '@/features/warehouses/types/warehouse.types'

interface Props {
  isEmployee: boolean
  destWarehouseName: string
  destWarehouseId: number
  warehouses: Warehouse[]
  onSelectDestId: (id: number) => void
  localStockInDest?: number
  hasFocusedProduct?: boolean
}

export const TransferDestinationSection: React.FC<Props> = ({
  isEmployee,
  destWarehouseName,
  destWarehouseId,
  warehouses,
  onSelectDestId,
  localStockInDest = 0,
  hasFocusedProduct = false,
}) => {
  if (isEmployee) {
    return (
      <section className="transfer-header-dest-card" aria-label="Sede de destino del empleado">
        <div className="transfer-dest-left">
          <Icon svg={mapPinIcon} size="lg" className="transfer-dest-icon" />
          <div className="transfer-dest-details">
            <strong className="transfer-dest-name">{destWarehouseName}</strong>
            <span className="transfer-dest-pill">Tu sede actual (Recepción)</span>
          </div>
        </div>
        {hasFocusedProduct && (
          <div className="transfer-dest-right">
            <span className="transfer-dest-stock-label">Stock en tu sede:</span>
            <span className="transfer-dest-stock-qty">{localStockInDest} uds</span>
          </div>
        )}
      </section>
    )
  }

  return (
    <section className="transfer-header-dest-card is-admin" aria-label="Sede destino para administradores">
      <div className="transfer-admin-route-single">
        <label htmlFor="transfer-admin-dest" className="transfer-admin-label">
          Sede destino (donde ingresará la mercancía)
        </label>
        <select
          id="transfer-admin-dest"
          className="transfer-select-control drawer-form-control"
          value={destWarehouseId}
          onChange={(e) => onSelectDestId(Number(e.target.value))}
        >
          <option value={0} disabled>Seleccionar bodega de destino…</option>
          {warehouses.map((wh) => (
            <option key={wh.id} value={wh.id}>{wh.name} (#{wh.id})</option>
          ))}
        </select>
      </div>
    </section>
  )
}

