// TransferStockMatrix · tabla visual de existencias físicas por bodega (models.ProductLocation)
// conecta con: CreateTransferModal, transfers.types y tokens.css
import React from 'react'
import type { WarehouseStockLocation } from '../types/transfers.types'

interface Props {
  productCode: string
  locations: WarehouseStockLocation[]
}

export const TransferStockMatrix: React.FC<Props> = ({ productCode, locations }) => {
  return (
    <div className="transfer-matrix-wrapper">
      <div className="transfer-matrix-title">
        Existencias Físicas en TODAS las Bodegas ({productCode})
      </div>
      <table className="transfer-matrix-table">
        <thead>
          <tr>
            <th>Bodega</th>
            <th>Físico</th>
            <th>Reservado</th>
            <th>Disponible</th>
          </tr>
        </thead>
        <tbody>
          {locations.map((loc) => (
            <tr key={loc.warehouseId}>
              <td>{loc.warehouseName}</td>
              <td>{loc.stock} uds</td>
              <td>{loc.reservedStock} uds</td>
              <td>
                <span
                  className={`transfer-stock-badge ${
                    loc.availableStock === 0 ? 'transfer-stock-badge-zero' : ''
                  }`}
                >
                  {loc.availableStock} uds
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default TransferStockMatrix
