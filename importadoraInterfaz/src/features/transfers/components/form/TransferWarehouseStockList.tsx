// TransferWarehouseStockList · desglose de todas las bodegas activas (con unidades o agotadas) con stock físico disponible y selector de cantidades a pedir
// conecta con: CreateTransferForm y useTransferRequest
import React from 'react'
import type { Warehouse } from '@/features/warehouses'

interface Props {
  warehouses: Warehouse[]
  destWarehouseId: number
  stockByWarehouse: Record<string, number> // lo vendible real en cada bodega de la compañía (no el mapa de la tarjeta, que solo conoce la bodega activa)
  loading: boolean
  error: string | null
  getOriginQty: (originWarehouseId: number) => number
  setOriginQty: (originWarehouseId: number, originWarehouseName: string, maxStock: number, quantity: number) => void
}

export const TransferWarehouseStockList: React.FC<Props> = ({
  warehouses,
  destWarehouseId,
  stockByWarehouse,
  loading,
  error,
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
        <strong>Disponibilidad en sedes de origen</strong>
        <small>Indica las unidades que solicitarás a cada bodega</small>
      </div>

      {error && <div className="form-field-error-msg">{error}</div>}

      <div className="transfer-wh-table-wrapper">
        <table className="transfer-wh-table">
          <thead>
            <tr>
              <th className="th-origin">Sede origen</th>
              <th className="th-stock">Disponible</th>
              <th className="th-qty">Pedir</th>
            </tr>
          </thead>
          <tbody>
            {originWarehouses.map((wh) => {
              const originId = Number(wh.id)
              const physicalStock = Number(stockByWarehouse[String(originId)] ?? 0)
              const requestedQty = getOriginQty(originId)
              const hasStock = !loading && physicalStock > 0

              return (
                <tr
                  key={wh.id}
                  className={`transfer-wh-row ${hasStock ? 'is-available' : 'is-empty'} ${requestedQty > 0 ? 'is-selected' : ''}`}
                >
                  <td className="td-origin">
                    <span className="transfer-wh-badge">{wh.code || `B-${originId}`}</span>
                    <span className="transfer-wh-name" title={wh.name}>{wh.name}</span>
                  </td>

                  <td className="td-stock">
                    {loading ? (
                      <span className="transfer-stock-status loading">Consultando…</span>
                    ) : hasStock ? (
                      <span className="transfer-stock-status available">{physicalStock} uds</span>
                    ) : (
                      <span className="transfer-stock-status empty">Agotado</span>
                    )}
                  </td>

                  <td className="td-qty">
                    {hasStock ? (
                      <div className="transfer-stepper-compact">
                        <button
                          type="button"
                          className="stepper-btn"
                          disabled={requestedQty <= 0}
                          onClick={() => setOriginQty(originId, wh.name, physicalStock, requestedQty - 1)}
                          aria-label={`Restar unidades de ${wh.name}`}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          inputMode="numeric"
                          className="stepper-input"
                          min={0}
                          max={physicalStock}
                          value={requestedQty}
                          aria-label={`Cantidad a solicitar de ${wh.name}`}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value)
                            if (!Number.isNaN(val)) {
                              setOriginQty(originId, wh.name, physicalStock, Math.min(physicalStock, Math.max(0, Math.floor(val))))
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="stepper-btn"
                          disabled={requestedQty >= physicalStock}
                          onClick={() => setOriginQty(originId, wh.name, physicalStock, requestedQty + 1)}
                          aria-label={`Sumar unidades de ${wh.name}`}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <span className="transfer-qty-none">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TransferWarehouseStockList

