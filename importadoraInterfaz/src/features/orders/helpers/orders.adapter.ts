// orders.adapter · convierte lo que responde el backend en pedidos (conteos, filas de la tabla y detalle) a lo que usa la app, y filtra la tabla por texto
// conecta con: orders.service (lo aplica a cada respuesta), orders.selectors (filterOrders); es el único lugar que conoce los nombres del backend en pedidos
// ojo: un contador que falta o no es número queda en 0; el backend manda 0001-01-01T00:00:00Z cuando no hay fecha
import { ORDER_STAGES } from '../constants/orders.constants'
import type {
  OrderCountsDto,
  OrderDetailDto,
  OrderItemDto,
  OrderListItemDto,
  OrderPaymentDto,
  OrderPersonDto,
} from '../types/orders.api.types'
import type {
  OrderChannelKey,
  OrderDetail,
  OrderLine,
  OrderPayment,
  OrderPerson,
  OrderRow,
  OrderStageKey,
  StageCounts,
} from '../types/orders.types'

const text = (value: string | null | undefined): string => (value ?? '').trim()
const money = (value: number | undefined): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0)

const personName = (person: OrderPersonDto | null | undefined, fallback: string): string =>
  `${text(person?.name)} ${text(person?.lastName)}`.trim() || fallback

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

// PD-1234, o «Venta 9» cuando el backend no manda consecutivo
export const orderSerial = (serialCode: number | undefined | null, id: number): string =>
  serialCode ? `PD-${serialCode}` : `Venta ${id}`

export const toStageCounts = (dto: OrderCountsDto): StageCounts => {
  const counts = {} as StageCounts
  for (const stage of ORDER_STAGES) counts[stage.key] = money((dto as Record<string, number | undefined>)[stage.field])
  return counts
}

export const toOrderRow = (dto: OrderListItemDto, stage: OrderStageKey, channel: OrderChannelKey): OrderRow => ({
  id: dto.saleId,
  serial: orderSerial(dto.serialCode, dto.saleId),
  stage,
  channel,
  customerName: personName(dto.customerInformation, 'Sin cliente'),
  sellerName: personName(dto.sellerInformation, '—'),
  paymentMethod: text(dto.paymentMethod),
  totalAmount: money(dto.totalAmount),
  createdAt: dayOf(dto.createdAt),
  paused: dto.isPause === 1,
  paymentVerified: dto.verifiedTransaction === 1,
  locationVerified: dto.verifiedLocation === 1,
})

const toPerson = (dto: OrderPersonDto | null | undefined): OrderPerson => ({
  name: personName(dto, '—'),
  document: text(dto?.identification),
  email: text(dto?.email),
  priceType: text(dto?.priceType),
})

const toLine = (dto: OrderItemDto): OrderLine => {
  const info = dto.itemInformation
  const code = text(info?.code)
  return {
    id: dto.itemId ?? dto.productId,
    productId: dto.productId,
    code,
    title: text(info?.description) || [text(info?.categoryName), text(info?.modelName)].filter(Boolean).join(' ') || code || `Producto ${dto.productId}`,
    brand: text(info?.brandName),
    quantity: money(dto.quantity),
    price: money(dto.price),
    discount: money(dto.discount),
  }
}

const toPayment = (dto: OrderPaymentDto, index: number): OrderPayment => ({
  id: dto.paymentId ?? index,
  method: text(dto.paymentMethod),
  amount: money(dto.amount),
  status: text(dto.status),
  createdAt: dateTimeOf(dto.created_at),
})

export const toOrderDetail = (dto: OrderDetailDto): OrderDetail => {
  const sale = dto.sale
  return {
    id: sale.saleId,
    serial: orderSerial(sale.serialCode, sale.saleId),
    status: text(sale.status),
    stage: text(sale.invoiceStatus).toLowerCase(),
    channel: text(sale.saleChannel),
    paymentMethod: text(sale.paymentMethod),
    totalAmount: money(sale.totalAmount),
    shippingCost: money(sale.shippingCost),
    createdAt: dateTimeOf(sale.createdAt),
    updatedAt: dateTimeOf(sale.updateAt),
    paused: sale.isPause === 1,
    cancelled: sale.isCancelled === 1,
    paymentVerified: sale.verifiedTransaction === 1,
    locationVerified: sale.verifiedLocation === 1,
    customer: toPerson(sale.customerInformation),
    seller: toPerson(sale.sellerInformation),
    lines: (sale.saleItems ?? []).map(toLine),
    payments: (dto.payments ?? []).map(toPayment),
  }
}

// la búsqueda de la tabla: serie, cliente, vendedor o método de pago (sin tildes ni mayúsculas)
const plain = (value: string): string => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const filterOrders = (items: OrderRow[], query: string): OrderRow[] => {
  const needle = plain(query.trim())
  if (!needle) return items
  return items.filter((order) => plain(`${order.serial} ${order.customerName} ${order.sellerName} ${order.paymentMethod}`).includes(needle))
}
