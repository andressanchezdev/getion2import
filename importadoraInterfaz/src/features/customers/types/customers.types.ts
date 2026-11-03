// customers.types · contratos de clientes (usuarios), direcciones y descuentos: lo que usa la app y el estado del slice (lo que responde el backend está en customers.api.types)
// conecta con: customers.adapter, customers.slice, customers.selectors, los thunks y los componentes
// ojo: "cliente" es un usuario del backend (POST /users); el backend no separa clientes de vendedores en el listado, por eso se muestra su userType
import type { LoadStatus, PaginatorMetadata } from '@/api'

// ---- lo que usa la app ----
export interface Customer {
  id: number
  name: string
  lastName: string
  fullName: string
  identification: string
  email: string
  photo: string
  userType: string
  priceType?: string // nivel de precio del cliente (P0..P3)
  businessName: string // razón social o nombre comercial ('' si no hay)
  isActive?: boolean
  status?: string
}

export interface CustomerCompany {
  businessName: string
  tradeName: string
  corporateName: string
  nit: string
  address: string
  cityAndDepartment: string
  phone?: number
  cellPhone?: number
  email: string
  customerType: string
  personType: string
  regimeType: string
  legalRepresentative: string
  mailInvoicing: string
}

export interface CustomerDetail extends Customer {
  commissionRate?: number
  company: CustomerCompany
}

export interface Direction {
  id: number
  address: string
  neighborhood: string
  city: string
  department: string
  country: string
  additionalInfo: string
}

// lo que se llena en el formulario de una dirección nueva
export interface DirectionInput {
  address: string
  neighborhood: string
  city: string
  department: string
  country: string
  additionalInfo: string
}

// un descuento del cliente: aplica a un producto, marca, categoría o modelo (el que venga con id); rate es el porcentaje
export interface Discount {
  id: number
  brandId?: number
  categoryId?: number
  modelId?: number
  productId?: number
  quantity: number
  price: number
  rate: number
  isActive: boolean
}

// vigencia de un documento: vigente, vence pronto o ya venció
export type DocumentStatus = 'valid' | 'expiring' | 'expired'

// un documento adjunto del cliente (RUT, cédula, cámara de comercio...) con su vencimiento
export interface CustomerDocument {
  id: number
  customerId: number
  type: string // 'rut' | 'id_card' | 'chamber' | 'credit_form' | 'other'
  fileName: string
  fileUrl: string
  notes: string
  uploadedAt: string
  expiresAt: string
  status: DocumentStatus
  daysLeft: number // negativo si ya venció
}

// un documento vencido o por vencer junto al cliente que debe renovarlo
export interface CustomerDocumentAlert {
  documentId: number
  customerId: number
  customerName: string
  customerDocument: string
  type: string
  fileName: string
  expiresAt: string
  status: DocumentStatus
  daysLeft: number
}

// ---- estado del slice (no se guarda en el navegador) ----
export interface CustomersListState {
  items: Customer[]
  status: LoadStatus
  error: string | null
  meta: PaginatorMetadata | null
  page: number
  query: string // texto de búsqueda (se aplica en pantalla sobre la página cargada: el listado del backend no filtra por texto)
  requestId: string | null // la última carga lanzada: una respuesta anterior se descarta
}

export interface CustomerDetailState {
  data: CustomerDetail | null
  status: LoadStatus
  error: string | null
  requestId: string | null
}

// direcciones y descuentos del cliente seleccionado; saving = hay un cambio en curso (agregar o borrar)
export interface CustomerListResource<T> {
  items: T[]
  status: LoadStatus
  error: string | null
  saving: boolean
}

export interface CustomersState {
  list: CustomersListState
  selectedId: number | null // cliente abierto en el panel derecho
  detail: CustomerDetailState
  directions: CustomerListResource<Direction>
  discounts: CustomerListResource<Discount>
  documents: CustomerListResource<CustomerDocument> // documentos del cliente abierto
  documentAlerts: CustomerListResource<CustomerDocumentAlert> // vencidos o por vencer de toda la compañía
}
