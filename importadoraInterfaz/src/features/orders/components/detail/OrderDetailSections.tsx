// OrderDetailSections · las cajas del detalle de un pedido (las .sec de la maqueta): resumen, cliente y vendedor, líneas y pagos
// conecta con: OrderDetail (le pasa el detalle ya convertido); global Pill y format (pesos y fecha)
// ojo: aquí va lo de segundo nivel que no cabe en la tabla (canal, verificaciones, envío, fechas, líneas y pagos)
import React from 'react'
import { formatDateTime, formatPesos } from '@/global/helpers/format'
import { Pill } from '@/global/components/UI/atoms/Pill'
import { ORDER_CHANNELS, ORDER_STAGES, PAYMENT_METHOD_LABELS } from '../../constants/orders.constants'
import type { OrderDetail } from '../../types/orders.types'
import './OrderDetailSections.css'

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="order-section-row">
    <span>{label}</span>
    <b>{children}</b>
  </div>
)

const Box: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="order-section">
    <h5 className="order-section-title">{title}</h5>
    {children}
  </section>
)

const paymentLabel = (method: string): string => PAYMENT_METHOD_LABELS[method.toLowerCase()] ?? (method || '—')
const flag = (ok: boolean, yes: string, no: string) => <Pill tone={ok ? 'green' : 'gray'}>{ok ? yes : no}</Pill>

export const OrderSummarySection: React.FC<{ order: OrderDetail }> = ({ order }) => (
  <Box title="Resumen">
    <Row label="Etapa">
      <Pill tone="blue">{ORDER_STAGES.find((stage) => stage.key === order.stage)?.label ?? (order.stage || '—')}</Pill>
      {order.paused && <Pill tone="amber">En pausa</Pill>}
      {order.cancelled && <Pill tone="red">Anulado</Pill>}
    </Row>
    <Row label="Canal">{ORDER_CHANNELS.find((channel) => channel.key === order.channel)?.label ?? (order.channel || '—')}</Row>
    <Row label="Método de pago">{paymentLabel(order.paymentMethod)}</Row>
    <Row label="Pago">{flag(order.paymentVerified, 'Verificado', 'Sin verificar')}</Row>
    <Row label="Ubicación">{flag(order.locationVerified, 'Verificada', 'Sin verificar')}</Row>
    <Row label="Total">{formatPesos(order.totalAmount)}</Row>
    {order.shippingCost > 0 && <Row label="Envío">{formatPesos(order.shippingCost)}</Row>}
    <Row label="Creado">{formatDateTime(order.createdAt)}</Row>
    <Row label="Actualizado">{formatDateTime(order.updatedAt)}</Row>
  </Box>
)

export const OrderPeopleSection: React.FC<{ order: OrderDetail }> = ({ order }) => (
  <>
    <Box title="Cliente">
      <Row label="Nombre">{order.customer.name}</Row>
      {order.customer.document && <Row label="Documento">{order.customer.document}</Row>}
      {order.customer.email && <Row label="Correo">{order.customer.email}</Row>}
      {order.customer.priceType && <Row label="Nivel de precio">{order.customer.priceType}</Row>}
    </Box>
    <Box title="Vendedor">
      <Row label="Nombre">{order.seller.name}</Row>
      {order.seller.email && <Row label="Correo">{order.seller.email}</Row>}
    </Box>
  </>
)

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

export const OrderPaymentsSection: React.FC<{ order: OrderDetail }> = ({ order }) => (
  <Box title="Pagos y abonos">
    {order.payments.length === 0 && <p className="order-section-empty">Aún no hay pagos registrados.</p>}
    {order.payments.map((payment) => (
      <Row key={payment.id} label={`${paymentLabel(payment.method)}${payment.createdAt ? ` · ${formatDateTime(payment.createdAt)}` : ''}`}>
        {formatPesos(payment.amount)}
        {payment.status && <Pill tone="gray">{payment.status}</Pill>}
      </Row>
    ))}
  </Box>
)
