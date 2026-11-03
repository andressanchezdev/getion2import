// OrderHistorySection · caja «Historial de etapas» del detalle de un pedido: por cada etapa, quién lo movió, cuándo entró y cuánto estuvo
// conecta con: OrderDrawer (la pinta), OrderSectionParts (caja y fila), orders.constants (nombres de etapa) y global format (fecha y hora)
// ojo: «Verificación confirmada» es el pago ya cubierto (lo verificado más lo dejado a crédito): el pedido espera ahí en la cola de alistamiento
import React from 'react'
import { formatDateTime } from '@/global/helpers/formatting/format'
import { STAGE_ENTRY_LABELS } from '../../../constants/orders.constants'
import { durationLabel } from '../../../helpers/orders.labels'
import type { OrderDetail, OrderStageEntry } from '../../../types/orders.types'
import { Box, Row } from './OrderSectionParts'

const entryLabel = (entry: OrderStageEntry): string => `${STAGE_ENTRY_LABELS[entry.stage] ?? entry.stage}${entry.leftAt ? '' : ' (actual)'}`

export const OrderHistorySection: React.FC<{ order: OrderDetail }> = ({ order }) => (
  <Box title="Historial de etapas">
    {order.history.length === 0 && <p className="order-section-empty">Todavía no hay movimientos registrados.</p>}
    {order.history.map((entry, index) => (
      <Row key={`${entry.stage}-${index}`} label={`${entryLabel(entry)} · ${entry.employeeName}`}>
        {entry.enteredAt ? formatDateTime(entry.enteredAt) : '—'} · {durationLabel(entry.minutes)}
      </Row>
    ))}
  </Box>
)

export default OrderHistorySection
