// suppliers.adapter · convierte lo que responde el backend en proveedores a lo que usa la app
// conecta con: suppliers.service (lo aplica a cada respuesta); es el único lugar que conoce los nombres del backend en proveedores
// ojo: el nombre del proveedor llega vacío en varios casos: se usa el del contacto y, si tampoco hay, el documento
import type { SupplierDto, SuppliersSummaryDto } from '../types/suppliers.api.types'
import type { Supplier, SuppliersSummary } from '../types/suppliers.types'

const text = (value: string | undefined | null): string => (value ?? '').trim()
const num = (value: number | undefined | null): number => (Number.isFinite(value) ? (value as number) : 0)

export const toSupplier = (dto: SupplierDto): Supplier => {
  const document = [text(dto.documentType), text(dto.documentId)].filter(Boolean).join(' ')
  return {
    id: dto.supplierId,
    name: text(dto.name) || text(dto.contactName) || text(dto.documentId) || `Proveedor ${dto.supplierId}`,
    document,
    contactName: text(dto.contactName),
    contactPhone: text(dto.contactPhone) || text(dto.phone),
    contactEmail: text(dto.contactEmail) || text(dto.email),
    city: text(dto.city),
    paymentTerms: num(dto.paymentTerms),
    creditLimit: num(dto.creditLimit),
    isActive: dto.isActive !== false,
    createdAt: text(dto.createdAt).slice(0, 10),
  }
}

export const toSuppliersSummary = (dto: SuppliersSummaryDto): SuppliersSummary => ({
  total: num(dto.totalSuppliers),
  active: num(dto.activeSuppliers),
  products: num(dto.totalProducts),
  totalCreditLimit: num(dto.totalCreditLimit),
})
