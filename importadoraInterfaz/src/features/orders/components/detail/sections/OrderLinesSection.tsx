// OrderLinesSection · caja «Líneas» del detalle de un pedido: cada producto con su cantidad, precio, descuento y total
// conecta con: OrderDrawer (la pinta), OrderSectionParts (caja) y global format (pesos)
import React from 'react'
import { formatPesos } from '@/global/helpers/formatting/format'
import { ProductLine, ProductLineList } from '@/global/components/UI/molecules/product/ProductLine'
import { useProductImages } from '@/features/shop'
import type { OrderDetail } from '../../../types/orders.types'
import { Box } from './OrderSectionParts'

// los renglones (productos) del pedido, con la imagen de cada repuesto
export const OrderLinesSection: React.FC<{ order: OrderDetail }> = ({ order }) => {
  const images = useProductImages(order.lines.map((line) => line.productId))
  return (
  <Box title={`Líneas (${order.lines.length})`}>
    {order.lines.length === 0 && <p className="order-section-empty">El pedido no trae líneas.</p>}
    <ProductLineList>
      {order.lines.map((line) => (
        <ProductLine
          key={line.id}
          name={line.title}
          code={line.code}
          imageUrl={images[line.productId]}
          meta={line.brand}
          quantity={line.quantity}
          unitPrice={line.price}
          total={line.quantity * line.price - line.discount}
          note={line.discount > 0 ? `Descuento ${formatPesos(line.discount)}` : undefined}
        />
      ))}
    </ProductLineList>
  </Box>
  )
}

export default OrderLinesSection
