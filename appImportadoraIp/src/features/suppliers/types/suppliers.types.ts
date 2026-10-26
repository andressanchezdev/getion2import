// suppliers.types · tipos de la app para proveedores: una fila de la lista, los totales y el estado
// conecta con: suppliers.adapter (los arma), suppliers.slice (los guarda), suppliers.selectors y SuppliersScreen
import type { LoadStatus, PaginatorMetadata } from '@/api'

export interface Supplier {
  id: number
  name: string // nombre o, si viene vacío, el del contacto o su documento
  document: string // tipo y número de documento juntos
  contactName: string
  contactPhone: string
  contactEmail: string
  city: string
  paymentTerms: number // días de plazo de pago
  creditLimit: number
  isActive: boolean
  createdAt: string // AAAA-MM-DD o ''
}

export interface SuppliersSummary {
  total: number
  active: number
  products: number
  totalCreditLimit: number
}

export interface SuppliersState {
  items: Supplier[]
  status: LoadStatus
  error: string | null
  meta: PaginatorMetadata | null
  page: number
  query: string
  requestId: string | null
  summary: { data: SuppliersSummary | null; status: LoadStatus; error: string | null }
}
