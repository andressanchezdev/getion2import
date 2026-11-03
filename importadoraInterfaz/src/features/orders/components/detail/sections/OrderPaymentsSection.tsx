// OrderPaymentsSection · caja «Pagos y abonos» del detalle de un pedido: cada pago con su método, fecha, monto y estado
// conecta con: OrderDrawer (la pinta), OrderSectionParts (fila y caja), orders.labels (método de pago) y global Pill y format (pesos y fecha)
import React from 'react'
import { Pill } from '@/global/components/UI/atoms/Pill'
import { formatDateTime, formatPesos } from '@/global/helpers/formatting/format'
import { PAYMENT_STATUS_LABELS } from '../../../constants/orders.constants'
import { paymentLabel } from '../../../helpers/orders.labels'
import type { OrderDetail } from '../../../types/orders.types'
import { Box, Row } from './OrderSectionParts'

// los pagos del pedido y su estado
export const OrderPaymentsSection: React.FC<{ order: OrderDetail }> = ({ order }) => (
  <Box title="Pagos y abonos">
    {order.payments.length === 0 && <p className="order-section-empty">Aún no hay pagos registrados.</p>}
    {order.payments.map((payment) => (
      <Row key={payment.id} label={`${paymentLabel(payment.method)}${payment.createdAt ? ` · ${formatDateTime(payment.createdAt)}` : ''}`}>
        {formatPesos(payment.amount)}
        {payment.status && <Pill tone={payment.status === 'verified' ? 'green' : payment.status === 'review' ? 'amber' : 'gray'}>{PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}</Pill>}
      </Row>
    ))}
  </Box>
)

export default OrderPaymentsSection
