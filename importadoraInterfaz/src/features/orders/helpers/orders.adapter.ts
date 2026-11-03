// orders.adapter · convierte lo que responde la API en Go en pedidos (filas de la tabla y detalle) a lo que usa la app, y filtra la tabla por texto
// conecta con: orders.service (lo aplica a cada respuesta), orders.selectors (filterOrders); es el único lugar que conoce los nombres del backend en pedidos
// ojo: lo que la API no trae queda en un valor neutro: sin pausa, sin costo de envío y sin documento ni correo del cliente
import { ORDER_STAGES } from '../constants/orders.constants'
import type { SaleDto, SaleItemDto, SalePaymentDto, StageHistoryDto } from '../types/orders.api.types'
import type { OrderChannelKey, OrderDetail, OrderLine, OrderPayment, OrderRow, OrderStageEntry, OrderStageKey, StageCounts } from '../types/orders.types'

const text = (value: string | null | undefined): string => (value ?? '').trim()
// devuelve el número, o 0 si falta o no es válido
const money = (value: number | undefined): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0)

// AAAA-MM-DD, o '' si no hay fecha válida
const dayOf = (value: string | undefined): string => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) || date.getUTCFullYear() < 2000 ? '' : date.toISOString().slice(0, 10)
}

// fecha y hora completas para el detalle, o '' si no hay
const dateTimeOf = (value: string | undefined): string => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) || date.getUTCFullYear() < 2000 ? '' : value
}

// PD-1234, o «Venta 9» cuando el backend no manda el consecutivo
export const orderSerial = (serialCode: string | undefined | null, id: number): string => text(serialCode) || `Venta ${id}`

// la API solo distingue el picking inmediato
export const orderChannel = (sale: Pick<SaleDto, 'immediatePicking'>): OrderChannelKey => (sale.immediatePicking ? 'immediate' : 'standard')

// la etapa de la tabla: una de las cinco con lista; las demás (enviado, anulado) no tienen pestaña
export const toStageKey = (stage: string | undefined): OrderStageKey | null => ORDER_STAGES.find((item) => item.key === stage)?.key ?? null

// los totales de cada etapa (meta.totalRecords de GET /sales con ese filtro) como contadores
export const toStageCounts = (totals: Partial<Record<OrderStageKey, number>>): StageCounts => {
  const counts = {} as StageCounts
  for (const stage of ORDER_STAGES) counts[stage.key] = money(totals[stage.key])
  return counts
}

// el pago está cubierto cuando lo verificado más lo dejado a crédito alcanza el total; la ubicación, cuando ya pasó el alistamiento
const isPaid = (sale: SaleDto): boolean => money(sale.total) > 0 && money(sale.paidTotal) + money(sale.creditAmount) >= money(sale.total)
const PAST_PICKING = ['packing', 'invoicing', 'dispatch', 'sent']

// convierte un pedido de la API en una fila de la tabla
export const toOrderRow = (dto: SaleDto, stage: OrderStageKey): OrderRow => ({
  id: dto.id,
  serial: orderSerial(dto.serialCode, dto.id),
  stage,
  channel: orderChannel(dto),
  customerName: text(dto.customerName) || 'Sin cliente',
  sellerName: text(dto.employeeName) || '—',
  paymentMethod: text(dto.paymentMethod),
  totalAmount: money(dto.total),
  createdAt: dayOf(dto.createdAt),
  paused: false,
  paymentVerified: isPaid(dto),
  locationVerified: PAST_PICKING.includes(text(dto.currentStage)),
  paidAmount: money(dto.paidTotal),
  creditAmount: money(dto.creditAmount),
  confirmed: text(dto.currentStage) === 'verification_ok',
  currentStage: text(dto.currentStage),
})

// convierte un renglón de pedido de la API en el que usa la app
const toLine = (dto: SaleItemDto): OrderLine => ({
  id: dto.id,
  productId: dto.productId,
  code: text(dto.productCode),
  title: text(dto.productName) || text(dto.productCode) || `Producto ${dto.productId}`,
  brand: '',
  quantity: money(dto.quantity),
  price: money(dto.unitPrice),
  discount: money(dto.discount),
})

// convierte un pago de la API en el que usa la app
const toPayment = (dto: SalePaymentDto): OrderPayment => ({
  id: dto.id,
  method: text(dto.method),
  amount: money(dto.amount),
  status: text(dto.status),
  ...(dto.proofUrl !== undefined ? { proofUrl: dto.proofUrl } : {}),
  ...(dto.reference !== undefined ? { reference: dto.reference } : {}),
  createdAt: dateTimeOf(dto.createdAt),
})

// una etapa del historial del pedido
export const toStageEntry = (dto: StageHistoryDto): OrderStageEntry => ({
  stage: text(dto.stage),
  employeeName: text(dto.employeeName) || '—',
  enteredAt: dateTimeOf(dto.enteredAt),
  leftAt: dateTimeOf(dto.leftAt ?? undefined),
  minutes: money(dto.minutes),
})

// el detalle de un pedido: la venta con sus renglones y, aparte, sus pagos y el historial de etapas
export const toOrderDetail = (sale: SaleDto, payments: SalePaymentDto[], history: StageHistoryDto[] = []): OrderDetail => ({
  id: sale.id,
  serial: orderSerial(sale.serialCode, sale.id),
  status: text(sale.status),
  stage: text(sale.currentStage).toLowerCase(),
  channel: orderChannel(sale),
  paymentMethod: text(sale.paymentMethod),
  paymentProofUrl: sale.paymentProofUrl ?? null,
  paymentReference: sale.paymentReference ?? null,
  totalAmount: money(sale.total),
  shippingCost: 0,
  createdAt: dateTimeOf(sale.createdAt),
  updatedAt: dateTimeOf(sale.updatedAt),
  paused: false,
  cancelled: text(sale.status) === 'cancelled',
  paymentVerified: isPaid(sale),
  locationVerified: PAST_PICKING.includes(text(sale.currentStage)),
  customer: { name: text(sale.customerName) || 'Sin cliente', document: '', email: '', priceType: text(sale.priceTier) },
  seller: { name: text(sale.employeeName) || '—', document: '', email: '', priceType: '' },
  lines: (sale.items ?? []).map(toLine),
  payments: payments.map(toPayment),
  history: history.map(toStageEntry),
})

// la búsqueda de la tabla: serie, cliente, vendedor o método de pago (sin tildes ni mayúsculas)
const plain = (value: string): string => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// filtra los pedidos por texto (serie, cliente, vendedor...)
export const filterOrders = (items: OrderRow[], query: string): OrderRow[] => {
  const needle = plain(query.trim())
  if (!needle) return items
  return items.filter((order) => plain(`${order.serial} ${order.customerName} ${order.sellerName} ${order.paymentMethod}`).includes(needle))
}
