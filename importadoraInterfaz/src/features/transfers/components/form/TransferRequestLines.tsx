// TransferRequestLines · el pedido de traslado agrupado por bodega de origen: cada grupo será un traslado, con cantidad editable y botón de quitar
// conecta con: CreateTransferForm (la pinta), transfers.request (groupByOrigin) y useTransferRequest (cambiar y quitar líneas)
import React from 'react'
import { groupByOrigin } from '../../helpers/transfers.request'
import type { TransferRequestLine } from '../../types/transfers.types'

interface Props {
  lines: TransferRequestLine[]
  onQuantity: (line: TransferRequestLine, quantity: number) => void
  onRemove: (line: TransferRequestLine) => void
}

// una caja por bodega de origen con sus repuestos
export const TransferRequestLines: React.FC<Props> = ({ lines, onQuantity, onRemove }) => {
  if (lines.length === 0) return <p className="transfer-req-note">Busca un repuesto y elige de qué bodega lo pides. Puedes mezclar varias bodegas en el mismo pedido.</p>

  return (
    <div className="transfer-req-groups">
      {groupByOrigin(lines).map((group) => (
        <section key={group.originWarehouseId} className="transfer-req-group">
          <header className="transfer-req-group-head">
            <strong>Desde {group.originWarehouseName}</strong>
            <span>{group.lines.reduce((sum, line) => sum + line.quantity, 0)} uds</span>
          </header>
          <ul className="transfer-req-lines">
            {group.lines.map((line) => (
              <li key={line.productId} className="transfer-req-line">
                <div className="transfer-req-line-text">
                  <strong>{line.code}</strong>
                  <span>{line.description}</span>
                </div>
                <input
                  type="number"
                  className="transfer-req-qty"
                  min={1}
                  max={line.max}
                  value={line.quantity}
                  aria-label={`Cantidad de ${line.code} desde ${line.originWarehouseName} (máximo ${line.max})`}
                  onChange={(event) => onQuantity(line, Number(event.target.value))}
                />
                <span className="transfer-req-max">de {line.max}</span>
                <button type="button" className="transfer-req-remove" aria-label={`Quitar ${line.code}`} onClick={() => onRemove(line)}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export default TransferRequestLines
