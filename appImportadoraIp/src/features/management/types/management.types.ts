// management.types · tipos de la app para pedidos por etapa: etapas, desglose por canal y estado de la pantalla
// conecta con: management.adapter (los arma), management.slice (los guarda), management.selectors y PipelineScreen
import type { LoadStatus, PaginatorMetadata } from '@/api'

export type StageKey = 'verification' | 'picking' | 'packing' | 'invoicing' | 'dispatch' | 'sent'

export interface Stage {
  key: StageKey
  label: string
  count: number
}

export interface ChannelCount {
  key: string
  label: string
  count: number
}

export interface PipelineData {
  stages: Stage[]
  channels: ChannelCount[] // desglose de la etapa elegida
  extras: ChannelCount[] // contadores aparte (sin tomar, asignación final...)
}

// un pedido de la lista de una etapa y un canal (POST /management/saleOrders)
export interface ManagementOrder {
  id: number
  serialCode: number | null
  customerName: string
  sellerName: string
  paymentMethod: string
  totalAmount: number
  createdAt: string // AAAA-MM-DD, o '' si el backend no trae fecha
  paused: boolean
  transactionVerified: boolean
  locationVerified: boolean
}

export interface OrdersState {
  items: ManagementOrder[]
  meta: PaginatorMetadata | null
  page: number
  status: LoadStatus
  error: string | null
  requestId: string | null
}

export interface ManagementState {
  selected: StageKey
  channel: string | null // canal elegido dentro de la etapa (null = solo se ven los conteos)
  orders: OrdersState
  data: PipelineData | null
  status: LoadStatus
  error: string | null
  requestId: string | null
}
