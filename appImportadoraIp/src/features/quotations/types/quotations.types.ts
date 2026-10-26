// quotations.types · tipos de la app para cotizaciones: una fila de la lista, los totales y el estado de la pantalla
// conecta con: quotations.adapter (los arma), quotations.slice (los guarda), quotations.selectors y QuotationsScreen
import type { LoadStatus, PaginatorMetadata } from '@/api'

export interface Quotation {
  id: number
  number: string
  customerName: string
  sellerName: string
  status: string // estado que manda el backend (draft, sent, accepted, rejected, expired, converted)
  validUntil: string // AAAA-MM-DD, o ''
  expired: boolean // sigue como borrador o enviada pero su fecha de vigencia ya pasó
  lines: number
  totalAmount: number
  createdAt: string
}

export interface QuotationStats {
  total: number
  drafts: number
  sent: number
  accepted: number
  rejected: number
  expired: number
  converted: number
  totalValue: number
  acceptedValue: number
  conversionRate: number
}

export interface QuotationsState {
  items: Quotation[]
  meta: PaginatorMetadata | null
  page: number
  statusFilter: string // '' = todas
  status: LoadStatus
  error: string | null
  requestId: string | null
  stats: { data: QuotationStats | null; status: LoadStatus; error: string | null }
}
