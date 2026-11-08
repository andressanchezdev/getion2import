// billing.adapter · convierte lo que responde la API en Go (datos fiscales y series) a lo que usa la app
// conecta con: billing.service (convierte cada respuesta); es el único lugar que conoce los nombres del backend en facturación
// ojo: lo que la API no trae queda neutro: sin PDF, sin responsable y sin resolución
import type { BillingConfig, BillingConfigDto, DocSeries, DocSeriesDto, DocSeriesType, FiscalDocumentType, TypeFacturation } from '../types/billing.types'

const text = (value: string | null | undefined): string => (value ?? '').trim()
const dayOf = (value: string | null | undefined): string => (value ? value.slice(0, 10) : '')

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
  resolutionValidUntil: dayOf(dto.resolutionValidUntil),
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
