// TransferWarehouseStockList · desglose de todas las bodegas activas (con unidades o agotadas) con stock físico disponible y selector de cantidades a pedir
// conecta con: CreateTransferForm y useTransferRequest
import React from 'react'
import type { Warehouse } from '@/features/warehouses'
import type { CreateTransferInitialPayload } from '../../hooks/useTransferRequest'

interface Props {
  warehouses: Warehouse[]
  destWarehouseId: number
  focusedProduct: NonNullable<CreateTransferInitialPayload['product']>
  getOriginQty: (originWarehouseId: number) => number
  setOriginQty: (originWarehouseId: number, originWarehouseName: string, maxStock: number, quantity: number) => void
}

export const TransferWarehouseStockList: React.FC<Props> = ({
  warehouses,
  destWarehouseId,
  focusedProduct,
  getOriginQty,
  setOriginQty,
}) => {
  // Bodegas activas disponibles como origen (excluyendo la bodega de destino)
  const originWarehouses = warehouses.filter((wh) => Number(wh.id) !== destWarehouseId && wh.isActive !== false)

  if (originWarehouses.length === 0) {
    return (
      <div className="transfer-no-origins">
        <p>No hay otras sedes activas registradas para solicitar traslados.</p>
      </div>
    )
  }

  return (
    <div className="transfer-wh-list-container">
      <div className="transfer-wh-list-title">
        <strong>Disponibilidad en sedes activas</strong>
        <small>Elige de qué bodega(s) vas a pedir este repuesto</small>
      </div>

      <div className="transfer-wh-cards">
        {originWarehouses.map((wh) => {
          const originId = Number(wh.id)
          const physicalStock = Number(focusedProduct.stockByWarehouse?.[String(originId)] ?? 0)
          const requestedQty = getOriginQty(originId)
          const hasStock = physicalStock > 0

          return (
            <div
              key={wh.id}
              className={`transfer-wh-card ${hasStock ? 'is-available' : 'is-empty'} ${requestedQty > 0 ? 'is-selected' : ''}`}
            >
              <div className="transfer-wh-card-header">
                <div className="transfer-wh-card-info">
                  <span className="transfer-wh-code">{wh.code || `B-${originId}`}</span>
                  <strong className="transfer-wh-name">{wh.name}</strong>
                </div>

                <div className="transfer-wh-stock-indicator">
                  {hasStock ? (
                    <span className="transfer-stock-badge available">
                      {physicalStock} {physicalStock === 1 ? 'ud disponible' : 'uds disponibles'}
                    </span>
                  ) : (
                    <span className="transfer-stock-badge empty">Agotado</span>
                  )}
                </div>
              </div>

              {hasStock && (
                <div className="transfer-wh-card-action">
                  <span className="transfer-action-label">Unidades a pedir:</span>
                  <div className="transfer-stepper-control">
                    <button
                      type="button"
                      className="transfer-stepper-btn"
                      disabled={requestedQty <= 0}
                      onClick={() => setOriginQty(originId, wh.name, physicalStock, requestedQty - 1)}
                      aria-label={`Disminuir unidades de ${wh.name}`}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      className="transfer-stepper-input"
                      min={0}
                      max={physicalStock}
                      value={requestedQty}
                      aria-label={`Cantidad a solicitar de ${wh.name}`}
                      onChange={(e) => setOriginQty(originId, wh.name, physicalStock, Number(e.target.value))}
                    />
                    <button
                      type="button"
                      className="transfer-stepper-btn"
                      disabled={requestedQty >= physicalStock}
                      onClick={() => setOriginQty(originId, wh.name, physicalStock, requestedQty + 1)}
                      aria-label={`Aumentar unidades de ${wh.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default TransferWarehouseStockList

