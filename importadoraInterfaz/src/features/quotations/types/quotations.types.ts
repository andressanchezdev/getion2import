// quotations.types · modelos que usa la app en cotizaciones: cotización, renglones, filtros y estado del slice
// conecta con: quotations.adapter (los arma), quotations.service, el slice, los selectors y la pantalla de cotizaciones
import type { LoadStatus } from '@/api'

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted'

export interface QuotationItem {
  id: number
  productId: number
  code: string
  name: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface Quotation {
  id: number
  serialCode: string // identificador único de la cotización
  customerId: number
  customerName: string // vacío si el cliente no trae nombre
  whatsapp: string // celular (o teléfono) del cliente al que se le envía; '' si no se conoce
  employeeName: string // quién hizo la cotización
  status: QuotationStatus
  total: number
  notes: string
  createdAt: string
  items: QuotationItem[]
}

// filtros de la tabla: texto y rango de fechas de un día A a un día B (YYYY-MM-DD, ambos incluidos; '' = sin límite)
export interface QuotationFilters {
  search: string
  from: string
  to: string
}

export interface QuotationsState {
  list: { items: Quotation[]; status: LoadStatus; error: string | null; page: number; requestId: string | null }
  filters: QuotationFilters
  detail: { id: number | null; data: Quotation | null; status: LoadStatus; error: string | null }
}

// renglón de la cotización que se está armando en «Cotizar» (antes de crearla)
export interface QuotationDraftLine {
  productId: number
  code: string
  name: string
  imageUrl?: string
  meta: string // marca · modelo · nivel de precio
  quantity: number
  unitPrice: number // precio del nivel elegido, con IVA incluido (como en el carrito)
  ivaPercent: number
}
