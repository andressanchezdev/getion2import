// quotations.adapter · convierte lo que responde el backend en cotizaciones (lista y totales) a lo que usa la app
// conecta con: quotations.service (lo aplica a cada respuesta); es el único lugar que conoce los nombres del backend en cotizaciones
// ojo: una cotización en borrador o enviada cuya vigencia (validUntil) ya pasó se marca como vencida aunque el backend no cambie su estado; "today" se puede pasar para las pruebas
import type { QuotationDto, QuotationStatsDto } from '../types/quotations.api.types'
import type { Quotation, QuotationStats } from '../types/quotations.types'

const num = (value: number | undefined | null): number => (Number.isFinite(value) ? (value as number) : 0)
const text = (value: string | undefined | null): string => (value ?? '').trim()

const dayOf = (value: string | undefined): string => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) || date.getUTCFullYear() < 2000 ? '' : date.toISOString().slice(0, 10)
}

const OPEN_STATUSES = ['draft', 'sent']

export const toQuotation = (dto: QuotationDto, today: string = new Date().toISOString().slice(0, 10)): Quotation => {
  const status = text(dto.status).toLowerCase()
  const validUntil = dayOf(dto.validUntil)
  return {
    id: dto.quotationId,
    number: text(dto.quotationNumber) || `Cotización ${dto.quotationId}`,
    customerName: text(dto.userName) || (dto.userId ? `Usuario ${dto.userId}` : 'Sin cliente'),
    sellerName: text(dto.sellerName) || (dto.sellerId ? `Usuario ${dto.sellerId}` : '—'),
    status,
    validUntil,
    expired: OPEN_STATUSES.includes(status) && validUntil !== '' && validUntil < today,
    lines: num(dto.itemCount),
    totalAmount: num(dto.totalAmount),
    createdAt: dayOf(dto.createdAt),
  }
}

export const toQuotationStats = (dto: QuotationStatsDto): QuotationStats => ({
  total: num(dto.totalQuotations),
  drafts: num(dto.draftCount),
  sent: num(dto.sentCount),
  accepted: num(dto.acceptedCount),
  rejected: num(dto.rejectedCount),
  expired: num(dto.expiredCount),
  converted: num(dto.convertedCount),
  totalValue: num(dto.totalValue),
  acceptedValue: num(dto.acceptedValue),
  conversionRate: num(dto.conversionRate),
})
