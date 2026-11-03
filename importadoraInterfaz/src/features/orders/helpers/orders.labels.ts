// orders.labels · textos cortos de pedidos que se repiten en la tabla y en el detalle: método de pago y fecha
// conecta con: OrdersTable y las cajas del detalle del pedido (OrderSummarySection, OrderPaymentsSection); orders.constants (PAYMENT_METHOD_LABELS)
import { PAYMENT_METHOD_LABELS } from '../constants/orders.constants'

// texto en español del método de pago
export const paymentLabel = (method: string): string => PAYMENT_METHOD_LABELS[method.toLowerCase()] ?? (method || '—')

// pasa una fecha AAAA-MM-DD a DD/MM/AAAA
export const dateLabel = (day: string): string => (day ? day.split('-').reverse().join('/') : '—')

// «45 min» o «2 h 10 min»: cuánto estuvo un pedido en una etapa
export const durationLabel = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}
