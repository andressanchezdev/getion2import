// customers.adapter · convierte lo que responde la API en Go (clientes y sus direcciones) a lo que usa la app, y filtra la lista por texto
// conecta con: customers.service y customers.details.service (lo aplican a cada respuesta); customers.selectors (filterCustomers); es el único lugar que conoce los nombres del backend
// ojo: lo que la API no trae queda vacío (foto, comisión, descuentos por producto)
import { fromApiPriceTier } from '@/global/helpers/pricing/priceTier'
import type { AddressDto, CustomerDto } from '../types/customers.api.types'
import type { Customer, CustomerCompany, CustomerDetail, Direction, DirectionInput } from '../types/customers.types'

const text = (value: string | null | undefined): string => (value ?? '').trim()

// los teléfonos de la app son números; la API los guarda como texto
const phoneNumber = (value: string | null | undefined): number | undefined => Number(text(value).replace(/\D/g, '')) || undefined

// el cliente de la API → cliente de la lista; businessName sale del nombre comercial
export const toCustomer = (dto: CustomerDto): Customer => {
  const name = text(dto.name)
  const lastName = text(dto.lastName)
  return {
    id: dto.id,
    name,
    lastName,
    fullName: `${name} ${lastName}`.trim() || text(dto.email) || `Cliente ${dto.id}`,
    identification: text(dto.document),
    email: text(dto.email),
    photo: '',
    userType: text(dto.personType),
    priceType: fromApiPriceTier(dto.priceTier),
    businessName: text(dto.tradeName),
    isActive: dto.status !== 'inactive',
    status: dto.status || 'active',
  }
}

// los datos de la empresa del cliente: la API los trae planos en el mismo cliente
const toCompany = (dto: CustomerDto): CustomerCompany => ({
  businessName: text(dto.tradeName),
  tradeName: text(dto.tradeName),
  corporateName: text(dto.name),
  nit: dto.documentType === 'NIT' ? text(dto.document) : '',
  address: text(dto.address),
  cityAndDepartment: text(dto.city),
  phone: phoneNumber(dto.phone),
  cellPhone: phoneNumber(dto.mobile),
  email: text(dto.email),
  customerType: '',
  personType: text(dto.personType),
  regimeType: '',
  legalRepresentative: text(dto.legalRepresentative),
  mailInvoicing: '',
})

// GET /customers/:id: lo mismo más los datos completos de la empresa
export const toCustomerDetail = (dto: CustomerDto): CustomerDetail => ({
  ...toCustomer(dto),
  company: toCompany(dto),
  documentType: dto.documentType,
  personType: dto.personType,
  lastName: text(dto.lastName),
  tradeName: text(dto.tradeName),
  legalRepresentative: text(dto.legalRepresentative),
  mobile: text(dto.mobile),
  address: text(dto.address),
  city: text(dto.city),
  vatResponsible: dto.vatResponsible ?? false,
  fiscalRespCodes: dto.fiscalRespCodes ?? ['R-99-PN'],
  priceTier: dto.priceTier || 'p1',
  discountPercent: dto.discountPercent ?? 0,
  docsValidityMonths: dto.docsValidityMonths ?? 12,
})

// la dirección de la lista de direcciones del cliente; si no trae id se le da su posición (1, 2, 3…)
const toDirection = (dto: AddressDto, index: number): Direction => ({
  id: dto.id ?? index + 1,
  address: text(dto.address),
  neighborhood: text(dto.neighborhood),
  city: text(dto.city),
  department: text(dto.department),
  country: text(dto.country),
  additionalInfo: text(dto.additionalInfo),
})

// convierte las direcciones del cliente de la API en las que usa la app
export const toDirections = (dto: CustomerDto): Direction[] => (dto.addresses ?? []).map(toDirection)

// la lista de direcciones como se guarda en la API (PUT /customers/:id { addresses })
export const toAddressList = (directions: Direction[]): AddressDto[] => directions.map((item) => ({ ...item }))

// la dirección nueva con el siguiente id libre
export const withNewDirection = (current: Direction[], input: DirectionInput): Direction[] => [
  ...current,
  { id: current.reduce((max, item) => Math.max(max, item.id), 0) + 1, ...input },
]

// filtra por texto (nombre, documento, correo o razón social); sin texto devuelve todos
export const filterCustomers = (customers: Customer[], query: string): Customer[] => {
  const needle = query.trim().toLowerCase()
  if (!needle) return customers
  return customers.filter((customer) =>
    [customer.fullName, customer.identification, customer.email, customer.businessName].some((value) =>
      value.toLowerCase().includes(needle)
    )
  )
}
