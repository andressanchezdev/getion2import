// sales.types · tipos de la app para ventas: una fila del historial, un carrito pendiente y el estado de ambas listas
// conecta con: sales.adapter (los arma), sales.slice (los guarda), sales.selectors y las pantallas de historial y pendientes
import type { LoadStatus, PaginatorMetadata } from '@/api'

export interface SaleRow {
  id: number
  serialCode: number | null // consecutivo visible (PD-xxxx); null si el backend no lo manda
  customerName: string
  sellerName: string
  status: string // invoiceStatus tal cual lo manda el backend (verification, picking...)
  totalAmount: number
  paidAmount: number
  createdAt: string // AAAA-MM-DD, o '' si el backend no trae fecha
}

export interface PendingCart {
  uuid: string
  customerId: number | null
  customerName: string
  sellerName: string
  lines: number
  units: number
  totalAmount: number
  createdAt: string
}

export interface SalesListState<T> {
  items: T[]
  status: LoadStatus
  error: string | null
  meta: PaginatorMetadata | null
  page: number
  requestId: string | null
}

export interface SalesState {
  history: SalesListState<SaleRow>
  pending: SalesListState<PendingCart>
}
