// quotations.api.types · lo que responde el backend en cotizaciones (nombres tal cual de las respuestas reales)
// conecta con: quotations.adapter (los convierte a los tipos de la app) y quotations.service (los pide)
// ojo: POST /quotations responde { data: [...], page, pageSize, totalRows, totalPages } DENTRO de data (no usa el meta de siempre); con sellerId y userId juntos solo trae las de esa persona como vendedor Y cliente a la vez

// una fila de POST /quotations (models.QuotationResponse sin las líneas)
export interface QuotationDto {
  quotationId: number
  quotationNumber?: string
  userId?: number
  userName?: string
  sellerId?: number
  sellerName?: string
  subtotal?: number
  taxAmount?: number
  discountAmount?: number
  totalAmount?: number
  status?: string
  validUntil?: string
  createdAt?: string
  itemCount?: number
  notes?: string
}

export interface QuotationsPageDto {
  data?: QuotationDto[] | null
  page?: number
  pageSize?: number
  totalRows?: number
  totalPages?: number
}

// GET /quotations/stats
export interface QuotationStatsDto {
  totalQuotations?: number
  draftCount?: number
  sentCount?: number
  acceptedCount?: number
  rejectedCount?: number
  expiredCount?: number
  convertedCount?: number
  totalValue?: number
  acceptedValue?: number
  conversionRate?: number
}
