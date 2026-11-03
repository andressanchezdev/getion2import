// orders.types · tipos de la app para pedidos: etapas, canales, fila de la tabla, detalle y estado de la pantalla
// conecta con: orders.adapter (los arma), orders.slice (los guarda), orders.selectors y los componentes de la pantalla de pedidos
import type { LoadStatus } from '@/api'

// etapas con lista de pedidos (los «Enviados» no tienen lista en el backend)
export type OrderStageKey = 'verification' | 'picking' | 'packing' | 'invoicing' | 'dispatch'

// ojo: la API no tiene canales de venta; lo único que distingue un pedido es si se hace con picking inmediato
export type OrderChannelKey = 'standard' | 'immediate'

// «all» junta los dos canales
export type OrderChannelFilter = 'all' | OrderChannelKey

// una fila de la tabla: lo más importante de cada pedido
export interface OrderRow {
  id: number
  serial: string // PD-1234, o «Venta 9» si el backend no manda el consecutivo
  stage: OrderStageKey
  channel: OrderChannelKey
  customerName: string
  sellerName: string
  paymentMethod: string
  totalAmount: number
  createdAt: string // AAAA-MM-DD, o '' si el backend no trae fecha
  paused: boolean
  paymentVerified: boolean // el pago ya cubre el total (lo verificado más lo que quedó a crédito)
  locationVerified: boolean
  paidAmount: number // pagos verificados
  creditAmount: number // lo que el cliente dejó a crédito
  confirmed: boolean // verificación confirmada: el pago quedó cubierto y espera en la cola de la etapa siguiente
  currentStage: string // la etapa real del pedido en el backend (por ejemplo verification_ok o picking_ok); de ella depende la siguiente acción
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
  proofUrl?: string | null
  reference?: string | null
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
  paymentProofUrl?: string | null
  paymentReference?: string | null
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
  history: OrderStageEntry[] // etapas por las que pasó el pedido
}

// una etapa del historial del pedido: quién lo movió, cuándo entró, cuándo salió y cuánto estuvo
export interface OrderStageEntry {
  stage: string
  employeeName: string
  enteredAt: string
  leftAt: string // '' si todavía está en esa etapa
  minutes: number
}

export type StageCounts = Record<OrderStageKey, number>

export interface OrdersListState {
  items: OrderRow[]
  status: LoadStatus
  error: string | null
  requestId: string | null
  capped: boolean // true si la etapa tiene más pedidos de los que se piden en la página (se muestran los más recientes)
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
  selectedWarehouseId: number | null
  counts: StageCounts | null
  list: OrdersListState
  openId: number | null
  detail: OrderDetailState
}
