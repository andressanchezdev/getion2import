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
}
