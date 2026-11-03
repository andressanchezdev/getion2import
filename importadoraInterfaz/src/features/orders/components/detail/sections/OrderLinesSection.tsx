// OrderLinesSection · caja «Líneas» del detalle de un pedido: cada producto con su cantidad, precio, descuento y total
// conecta con: OrderDrawer (la pinta), OrderSectionParts (caja) y global format (pesos)
import React from 'react'
import { formatPesos } from '@/global/helpers/formatting/format'
import type { OrderDetail } from '../../../types/orders.types'
import { Box } from './OrderSectionParts'

// los renglones (productos) del pedido
export const OrderLinesSection: React.FC<{ order: OrderDetail }> = ({ order }) => (
  <Box title={`Líneas (${order.lines.length})`}>
    {order.lines.length === 0 && <p className="order-section-empty">El pedido no trae líneas.</p>}
    {order.lines.map((line) => (
      <div key={line.id} className="order-line">
        <div className="order-line-text">
          <span className="order-line-title">{line.title}</span>
          <small>{[line.brand, line.code].filter(Boolean).join(' · ')}</small>
        </div>
        <div className="order-line-amounts">
          <small>
            {line.quantity} × {formatPesos(line.price)}
            {line.discount > 0 && ` − ${formatPesos(line.discount)}`}
          </small>
          <b>{formatPesos(line.quantity * line.price - line.discount)}</b>
        </div>
      </div>
    ))}
  </Box>
)

export default OrderLinesSection
