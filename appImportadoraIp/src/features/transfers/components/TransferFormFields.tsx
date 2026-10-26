// TransferFormFields · campos de selección de bodega origen, destino y cantidad a trasladar
// conecta con: CreateTransferModal, TransferStockMatrix, ValidatedNumberInput
import React from 'react'
import { ValidatedNumberInput } from '@/global/components/UI/molecules/form'
import { TransferStockMatrix } from './TransferStockMatrix'
import type { ProductStockMatrix } from '../types/transfers.types'
import type { Warehouse } from '@/features/warehouses/types/warehouse.types'

interface TransferFormFieldsProps {
  product: ProductStockMatrix
  warehouses: Warehouse[]
  originWarehouseId: number
  destWarehouseId: number
  quantity: string
  maxAvailable: number
  errorMsg: string | null
  onOriginChange: (id: number) => void
  onDestChange: (id: number) => void
  onQuantityChange: (qty: string) => void
}

export const TransferFormFields: React.FC<TransferFormFieldsProps> = ({
  product,
  warehouses,
  originWarehouseId,
  destWarehouseId,
  quantity,
  maxAvailable,
  errorMsg,
  onOriginChange,
  onDestChange,
  onQuantityChange,
}) => {
  return (
    <>
      <TransferStockMatrix
        productCode={product.code}
        locations={product.locations}
      />

      <div className="transfer-grid-2cols">
        <div>
          <label className="transfer-select-label">Bodega Origen (Salida)</label>
          <select
            className="transfer-select-control"
            value={originWarehouseId}
            onChange={(e) => onOriginChange(Number(e.target.value))}
          >
            <option value={0}>Selecciona bodega con stock...</option>
            {product.locations.filter((l) => l.availableStock > 0).map((l) => (
              <option key={l.warehouseId} value={l.warehouseId}>
                {l.warehouseName} ({l.availableStock} disponibles)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="transfer-select-label">Bodega Destino (Llegada)</label>
          <select
            className="transfer-select-control"
            value={destWarehouseId}
            onChange={(e) => onDestChange(Number(e.target.value))}
          >
            <option value={0}>Selecciona destino...</option>
            {warehouses.filter((w) => Number(w.id) !== originWarehouseId).map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
      </div>

      <ValidatedNumberInput
        id="transfer-qty"
        label={`Cantidad a Trasladar (Máx: ${maxAvailable})`}
        value={quantity}
        onChange={onQuantityChange}
        max={maxAvailable}
        min={1}
        error={errorMsg ?? undefined}
      />
    </>
  )
}
