// customers.api.types · lo que responde la API en Go en clientes (GET /customers y GET /customers/:id) y su lista de direcciones
// conecta con: customers.adapter (los convierte a los tipos de la app), customers.service y customers.details.service (los piden)
// ojo: nombres tal cual del backend (CustomerResponse); la app solo usa los tipos de customers.types
// ojo: las direcciones de entrega no son una tabla aparte: son una lista (JSON) dentro del cliente y se cambian con PUT /customers/:id

// una dirección de entrega guardada dentro del cliente; el id lo pone la app (la lista no tiene tabla propia)
export interface AddressDto {
  id?: number
  address?: string
  neighborhood?: string
  city?: string
  department?: string
  country?: string
  additionalInfo?: string
}

export interface CustomerDto {
  id: number
  companyId?: number
  documentType?: string // 'CC' | 'CE' | 'NIT' | 'PA'
  document?: string
  personType?: string // 'natural' | 'legal'
  name?: string
  lastName?: string | null
  tradeName?: string | null
  legalRepresentative?: string | null
  email?: string | null
  phone?: string | null
  mobile?: string | null
  address?: string | null
  city?: string | null
  vatResponsible?: boolean
  fiscalRespCodes?: string[]
  addresses?: AddressDto[] | null
  priceTier?: string // 'p1'..'p4'
  discountPercent?: number
  creditEnabled?: boolean
  creditLimit?: number
  creditDays?: number
  creditWarningPct?: number
  docsValidityMonths?: number
  status?: string
}

// lo que se manda a PUT /customers/:id para editar (solo se envía lo que se cambia)
export interface UpdateCustomerBody {
  documentType?: string
  document?: string
  personType?: string
  name?: string
  lastName?: string | null
  tradeName?: string | null
  legalRepresentative?: string | null
  email?: string | null
  phone?: string | null
  mobile?: string | null
  address?: string | null
  city?: string | null
  vatResponsible?: boolean
  fiscalRespCodes?: string[]
  priceTier?: string
  discountPercent?: number
  docsValidityMonths?: number
  status?: string
}

// lo que se manda a POST /customers para registrar un cliente
export interface CreateCustomerBody {
  documentType: string
  document: string
  personType: string
  name: string
  lastName?: string | null
  tradeName?: string | null
  legalRepresentative?: string | null
  email?: string | null
  phone?: string | null
  mobile?: string | null
  address?: string | null
  city?: string | null
  vatResponsible?: boolean
  fiscalRespCodes?: string[]
  priceTier?: string
  discountPercent?: number
  docsValidityMonths?: number
}

// un documento adjunto del cliente (GET /customers/:id/documents): la API calcula cuándo vence y su estado
export interface CustomerDocumentDto {
  id: number
  customerId: number
  docType: string // 'rut' | 'id_card' | 'chamber' | 'credit_form' | 'other'
  fileName: string
  fileUrl: string
  notes?: string | null
  uploadedAt: string
  expiresAt: string
  status: string // 'valid' | 'expiring' | 'expired'
  daysLeft: number // negativo si ya venció
}

// un documento vencido o por vencer con el cliente al que pertenece (GET /customers/documents/alerts)
export interface CustomerDocumentAlertDto {
  documentId: number
  customerId: number
  customerName: string
  customerDocument: string
  docType: string
  fileName: string
  expiresAt: string
  status: string
  daysLeft: number
}
