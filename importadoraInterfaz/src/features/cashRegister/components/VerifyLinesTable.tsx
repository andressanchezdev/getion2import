// VerifyLinesTable · tabla del cotejo de mercancía: cada renglón de la factura con su casilla de verificación
// conecta con: VerifyInvoiceGoodsModal (la usa); los renglones llegan de useSaleLines y el marcado vive en el modal
import React from 'react'
import { formatCurrency } from '@/global/helpers/format'
import type { InvoiceLineItem } from '../types/cash.types'

interface Props {
  lines: InvoiceLineItem[]
  loading: boolean
  checked: Record<number, boolean>
  onToggle: (lineId: number) => void
}

export const VerifyLinesTable: React.FC<Props> = ({ lines, loading, checked, onToggle }) => {
  const message = loading ? 'Cargando productos de la factura...' : lines.length === 0 ? 'No se encontraron líneas de producto para esta orden.' : null
  return (
    <div className="vig-items-table-wrapper">
      <table className="vig-table">
        <thead>
          <tr>
            <th className="vig-th-check">Cotejo</th>
            <th>SKU / Producto</th>
            <th className="vig-th-qty">Cant. Facturada</th>
            <th className="vig-th-price">Precio Unit.</th>
            <th className="vig-th-total">Total</th>
          </tr>
        </thead>
        <tbody>
          {message ? (
            <tr><td colSpan={5} className="vig-table-message">{message}</td></tr>
          ) : (
            lines.map((line) => {
              const isChecked = Boolean(checked[line.id])
              return (
                <tr key={line.id} className={`vig-row ${isChecked ? 'is-checked' : ''}`} onClick={() => onToggle(line.id)}>
                  <td className="vig-td-check">
                    <input type="checkbox" checked={isChecked} onChange={() => onToggle(line.id)} onClick={(e) => e.stopPropagation()} />
                  </td>
                  <td>
                    <strong>{line.productName}</strong>
                    {line.productCode && <small>SKU: {line.productCode}</small>}
                  </td>
                  <td className="vig-td-qty"><span className="vig-qty-badge">{line.quantity} un.</span></td>
                  <td className="vig-td-price">{formatCurrency(line.unitPrice)}</td>
                  <td className="vig-td-total">{formatCurrency(line.lineTotal)}</td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
