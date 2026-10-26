// suppliers.api.types · lo que responde el backend en proveedores (nombres tal cual del Swagger y de las respuestas reales)
// conecta con: suppliers.adapter (los convierte a los tipos de la app) y suppliers.service (los pide)
// ojo: name llega vacío en varios proveedores (el contacto sí trae nombre) y notes llega siempre vacío; createdAt viene como "2026-03-10 09:47:29" (sin T ni zona)

// POST /suppliers/list (una fila)
export interface SupplierDto {
  supplierId: number
  name?: string
  documentType?: string
  documentId?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  country?: string
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  paymentTerms?: number
  creditLimit?: number
  isActive?: boolean
  createdAt?: string
}

// GET /suppliers/summary
export interface SuppliersSummaryDto {
  totalSuppliers?: number
  activeSuppliers?: number
  totalProducts?: number
  totalCreditLimit?: number
}
