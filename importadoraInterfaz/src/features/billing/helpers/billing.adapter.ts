// billing.adapter · convierte lo que responde la API en Go (facturas, datos fiscales y series) a lo que usa la app, y filtra la tabla de facturas
// conecta con: billing.service (convierte cada respuesta) y useInvoices (filtra); es el único lugar que conoce los nombres del backend en facturación
// ojo: lo que la API no trae queda neutro: sin PDF, sin responsable y sin resolución
import type { BillingConfig, BillingConfigDto, DocSeries, DocSeriesDto, DocSeriesType, FiscalDocumentType, Invoice, InvoiceDto, InvoiceKind, InvoiceStatus, TypeFacturation } from '../types/billing.types'

const text = (value: string | null | undefined): string => (value ?? '').trim()
const dayOf = (value: string | null | undefined): string => (value ? value.slice(0, 10) : '')

export const toInvoice = (dto: InvoiceDto): Invoice => ({
  id: dto.id,
  number: text(dto.number),
  kind: (dto.kind === 'credit_note' ? 'credit_note' : 'invoice') as InvoiceKind,
  status: (['pending', 'issued', 'annulled'].includes(dto.status) ? dto.status : 'issued') as InvoiceStatus,
  saleId: dto.saleId,
  saleSerial: text(dto.saleSerial) || `Venta ${dto.saleId}`,
  warehouseName: text(dto.warehouseName),
  employeeName: text(dto.employeeName) || '—',
  issuedAt: dayOf(dto.issuedAt),
  pdfUrl: text(dto.pdfUrl),
})

export const toBillingConfig = (dto: BillingConfigDto): BillingConfig => ({
  id: dto.id,
  warehouseId: dto.warehouseId,
  typeFacturation: (dto.typeFacturation === 'natural' ? 'natural' : 'juridica') as TypeFacturation,
  documentType: (['NIT', 'CC', 'CE'].includes(dto.documentType) ? dto.documentType : 'NIT') as FiscalDocumentType,
  nit: text(dto.nit),
  legalName: text(dto.legalName),
  tradeName: text(dto.tradeName),
  billingEmail: text(dto.billingEmail),
  billingPhone: text(dto.billingPhone),
  billingAddress: text(dto.billingAddress),
  billingCity: text(dto.billingCity),
  vatWithholder: Boolean(dto.vatWithholder),
  incomeWithholder: Boolean(dto.incomeWithholder),
  selfWithholder: Boolean(dto.selfWithholder),
  invoicePrefix: text(dto.invoicePrefix),
  resolutionNumber: text(dto.resolutionNumber),
  resolutionDate: dayOf(dto.resolutionDate),
  rangeFrom: typeof dto.rangeFrom === 'number' ? dto.rangeFrom : null,
  rangeTo: typeof dto.rangeTo === 'number' ? dto.rangeTo : null,
  isActive: dto.isActive !== false,
})

export const toDocSeries = (dto: DocSeriesDto): DocSeries => ({
  id: dto.id,
  warehouseId: dto.warehouseId ?? null,
  docType: dto.docType as DocSeriesType,
  prefix: text(dto.prefix),
  nextNumber: dto.nextNumber,
})

const plain = (value: string): string => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// busca por número o por la venta (sin tildes ni mayúsculas) y filtra por estado
export const filterInvoices = (items: Invoice[], query: string, status: InvoiceStatus | 'all'): Invoice[] => {
  const needle = plain(query.trim())
  return items.filter((invoice) => (status === 'all' || invoice.status === status) && (!needle || plain(`${invoice.number} ${invoice.saleSerial}`).includes(needle)))
}
