// OrderSummarySection · caja «Resumen» del detalle de un pedido: etapa, canal, pago, ubicación, totales y fechas; si pagó por transferencia, el comprobante
// conecta con: OrderDrawer (la pinta), OrderSectionParts (fila, caja y etiqueta), OrderTransferProof (comprobante), orders.labels (método de pago) y global Pill y format (pesos y fecha)
// ojo: aquí va lo de segundo nivel que no cabe en la tabla (canal, verificaciones, envío y fechas)
import React from 'react'
import { Pill } from '@/global/components/UI/atoms/Pill'
import { formatDateTime, formatPesos } from '@/global/helpers/formatting/format'
import { ORDER_CHANNELS, ORDER_STAGES } from '../../../constants/orders.constants'
import { paymentLabel } from '../../../helpers/orders.labels'
import type { OrderDetail } from '../../../types/orders.types'
import { Box, Row, YesNoPill } from './OrderSectionParts'
import { OrderTransferProof } from './OrderTransferProof'

// resumen del pedido: serie, fecha, etapa, canal y totales
export const OrderSummarySection: React.FC<{ order: OrderDetail }> = ({ order }) => {
  const isTransfer = order.paymentMethod.toLowerCase() === 'transfer'
  const proof = order.paymentProofUrl || order.payments.find((p) => p.proofUrl)?.proofUrl
  const reference = order.paymentReference || order.payments.find((p) => p.reference)?.reference

  return (
    <Box title="Resumen">
      <Row label="Etapa">
        <Pill tone="blue">{ORDER_STAGES.find((stage) => stage.key === order.stage)?.label ?? (order.stage || '—')}</Pill>
        {order.paused && <Pill tone="amber">En pausa</Pill>}
        {order.cancelled && <Pill tone="red">Anulado</Pill>}
      </Row>
      <Row label="Canal">{ORDER_CHANNELS.find((channel) => channel.key === order.channel)?.label ?? (order.channel || '—')}</Row>
      <Row label="Método de pago">{isTransfer ? 'Transferencia bancaria' : paymentLabel(order.paymentMethod)}</Row>
      <Row label="Pago">
        <YesNoPill ok={order.paymentVerified} yes="Verificado" no="Sin verificar" />
      </Row>

      {isTransfer && <OrderTransferProof proof={proof} reference={reference} verified={order.paymentVerified} serial={order.serial} />}

      <Row label="Ubicación">
        <YesNoPill ok={order.locationVerified} yes="Verificada" no="Sin verificar" />
      </Row>
      <Row label="Total">{formatPesos(order.totalAmount)}</Row>
      {order.shippingCost > 0 && <Row label="Envío">{formatPesos(order.shippingCost)}</Row>}
      <Row label="Creado">{formatDateTime(order.createdAt)}</Row>
      <Row label="Actualizado">{formatDateTime(order.updatedAt)}</Row>
    </Box>
  )
}

export default OrderSummarySection
