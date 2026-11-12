// OrderPeopleSection · cajas «Cliente» y «Vendedor» del detalle de un pedido
// conecta con: OrderDrawer (la pinta) y OrderSectionParts (fila y caja)
import React from 'react'
import type { OrderDetail } from '../../../types/orders.types'
import { Box, Row } from './OrderSectionParts'

// las personas del pedido: cliente y vendedor
export const OrderPeopleSection: React.FC<{ order: OrderDetail }> = ({ order }) => (
  <>
    <Box title="Cliente">
      <Row label="Nombre">{order.customer.name}</Row>
      {order.customer.document && <Row label="Documento">{order.customer.document}</Row>}
      {order.customer.email && <Row label="Correo">{order.customer.email}</Row>}
    </Box>
    <Box title="Vendedor">
      <Row label="Nombre">{order.seller.name}</Row>
      {order.seller.email && <Row label="Correo">{order.seller.email}</Row>}
    </Box>
  </>
)

export default OrderPeopleSection
