// orders.types · tipos de la app para pedidos: etapas, canales, fila de la tabla, detalle y estado de la pantalla
// conecta con: orders.adapter (los arma), orders.slice (los guarda), orders.selectors y los componentes de la pantalla de pedidos
import type { LoadStatus } from '@/api'

// etapas con lista de pedidos (los «Enviados» no tienen lista en el backend)
export type OrderStageKey = 'verification' | 'picking' | 'packing' | 'invoicing' | 'dispatch'

export type OrderChannelKey = 'majority' | 'immediate' | 'corporate' | 'minority' | 'direct'

// «all» junta los cinco canales
export type OrderChannelFilter = 'all' | OrderChannelKey

// una fila de la tabla: lo más importante de cada pedido
export interface OrderRow {
  id: number
  serial: string // PD-1234, o «Venta 9» si el backend no manda consecutivo
  stage: OrderStageKey
  channel: OrderChannelKey
  customerName: string
  sellerName: string
  paymentMethod: string
  totalAmount: number
  createdAt: string // AAAA-MM-DD, o '' si el backend no trae fecha
  paused: boolean
  paymentVerified: boolean
  locationVerified: boolean
}

export interface OrderLine {
  id: number
  productId: number
  code: string
  title: string
  brand: string
  quantity: number
  price: number
  discount: number
}

export interface OrderPayment {
  id: number
  method: string
  amount: number
  status: string
  createdAt: string
}

export interface OrderPerson {
  name: string
  document: string
  email: string
  priceType: string
}

// lo de segundo nivel: se ve en el panel derecho al abrir un pedido
export interface OrderDetail {
  id: number
  serial: string
  status: string
  stage: string
  channel: string
  paymentMethod: string
  totalAmount: number
  shippingCost: number
  createdAt: string
  updatedAt: string
  paused: boolean
  cancelled: boolean
  paymentVerified: boolean
  locationVerified: boolean
  customer: OrderPerson
  seller: OrderPerson
  lines: OrderLine[]
  payments: OrderPayment[]
}

export type StageCounts = Record<OrderStageKey, number>

export interface OrdersListState {
  items: OrderRow[]
  status: LoadStatus
  error: string | null
  requestId: string | null
  capped: boolean // true si algún canal tenía más pedidos de los que se piden por página (se muestran los más recientes)
}

export interface OrderDetailState {
  data: OrderDetail | null
  status: LoadStatus
  error: string | null
  requestId: string | null
}

export interface OrdersState {
  stage: OrderStageKey
  channel: OrderChannelFilter
  query: string
  counts: StageCounts | null
  list: OrdersListState
  openId: number | null
  detail: OrderDetailState
}
