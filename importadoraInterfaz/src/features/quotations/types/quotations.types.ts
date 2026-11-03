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

// cliente elegible en el formulario de nueva cotización
export interface QuotationCustomerOption {
  id: number
  name: string
  identification: string
  phone: string
}

// producto elegible en el formulario (precio de mostrador P0)
export interface QuotationProductOption {
  id: number
  code: string
  name: string
  price: number
}

// renglón que se va armando antes de crear la cotización
export interface QuotationItemDraft {
  productId: number
  productCode: string
  productName: string
  quantity: number
  unitPrice: number
}
