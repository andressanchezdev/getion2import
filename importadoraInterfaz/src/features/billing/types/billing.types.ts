// billing.types · contratos de facturación: datos fiscales de la bodega, series de consecutivos y el estado del slice
// conecta con: billing.adapter, billing.rules, billing.service, billing.slice, los hooks y los componentes de facturación
import type { LoadStatus } from '@/api'

// ---- datos fiscales de la bodega ----
export type TypeFacturation = 'natural' | 'juridica'
export type FiscalDocumentType = 'NIT' | 'CC' | 'CE'

export interface BillingConfig {
  id: number
  warehouseId: number
  typeFacturation: TypeFacturation
  documentType: FiscalDocumentType
  nit: string
  legalName: string
  tradeName: string
  billingEmail: string
  billingPhone: string
  billingAddress: string
  billingCity: string
  vatWithholder: boolean
  incomeWithholder: boolean
  selfWithholder: boolean
  invoicePrefix: string
  resolutionNumber: string
  resolutionDate: string // AAAA-MM-DD o ''
  resolutionValidUntil: string // AAAA-MM-DD o ''
  rangeFrom: number | null
  rangeTo: number | null
  isActive: boolean
}

export interface BillingConfigDto {
  id: number
  warehouseId: number
  typeFacturation: string
  documentType: string
  nit: string
  legalName: string
  tradeName?: string
  billingEmail?: string
  billingPhone?: string
  billingAddress?: string
  billingCity?: string
  vatWithholder?: boolean
  incomeWithholder?: boolean
  selfWithholder?: boolean
  invoicePrefix?: string
  resolutionNumber?: string
  resolutionDate?: string | null
  resolutionValidUntil?: string | null
  rangeFrom?: number | null
  rangeTo?: number | null
  isActive?: boolean
}

// lo que se envía a PUT /warehouses/:id/facturation (todo opcional: se manda lo que se editó)
export type BillingConfigInput = Partial<Omit<BillingConfig, 'id' | 'warehouseId' | 'resolutionDate' | 'resolutionValidUntil' | 'rangeFrom' | 'rangeTo'>> & { resolutionDate?: string; resolutionValidUntil?: string; rangeFrom?: number; rangeTo?: number }

// ---- series de consecutivos ----
export type DocSeriesType = 'sale' | 'transfer' | 'quotation' | 'purchase' | 'payment' | 'invoice'

export interface DocSeries {
  id: number
  warehouseId: number | null
  docType: DocSeriesType
  prefix: string
  nextNumber: number
}

export interface DocSeriesDto {
  id: number
  warehouseId?: number | null
  docType: string
  prefix: string
  nextNumber: number
}

// ---- estado del slice (no se guarda en el navegador) ----
export interface BillingState {
  warehouseId: number | null // de qué bodega son los datos cargados (null = todas)
  config: BillingConfig | null // null = la bodega aún no tiene datos fiscales
  series: DocSeries[]
  settingsStatus: LoadStatus
  settingsError: string | null
  requestId: string | null
  saving: boolean
}
