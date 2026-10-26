// customers.adapter · convierte lo que responde el backend (usuarios, direcciones y descuentos) a lo que usa la app, y filtra la lista por texto
// conecta con: customers.service y customers.details.service (lo aplican a cada respuesta); customers.selectors (filterCustomers); es el único lugar que conoce los nombres del backend
import type { CompanyDto, DirectionDto, DiscountDto, UserDto } from '../types/customers.api.types'
import type { Customer, CustomerCompany, CustomerDetail, Direction, Discount } from '../types/customers.types'

const text = (value: string | null | undefined): string => (value ?? '').trim()

const toCompany = (dto: CompanyDto | null | undefined): CustomerCompany => ({
  businessName: text(dto?.businessName),
  tradeName: text(dto?.tradeName),
  corporateName: text(dto?.corporateName),
  nit: text(dto?.nit),
  address: text(dto?.address),
  cityAndDepartment: text(dto?.cityAndDepartment),
  phone: dto?.phone || undefined,
  cellPhone: dto?.cellPhone || undefined,
  email: text(dto?.email),
  customerType: text(dto?.customerType),
  personType: text(dto?.personType),
  regimeType: text(dto?.regimeType),
  legalRepresentative: text(dto?.legalRepresentative),
  mailInvoicing: text(dto?.mailInvoicing),
})

// usuario del backend → cliente de la lista; businessName sale de la razón social o del nombre comercial
export const toCustomer = (dto: UserDto): Customer => {
  const name = text(dto.name)
  const lastName = text(dto.lastName)
  const company = dto.companyInformation
  return {
    id: dto.userId,
    name,
    lastName,
    fullName: `${name} ${lastName}`.trim() || text(dto.email) || `Usuario ${dto.userId}`,
    identification: text(dto.identification),
    email: text(dto.email),
    photo: text(dto.photo),
    userType: text(dto.userType),
    priceType: text(dto.priceType) || undefined,
    businessName: text(company?.businessName) || text(company?.tradeName),
  }
}

// GET /users/{id}: lo mismo más la comisión y los datos completos de la empresa
export const toCustomerDetail = (dto: UserDto): CustomerDetail => ({
  ...toCustomer(dto),
  commissionRate: dto.comissionRate,
  company: toCompany(dto.companyInformation),
})

export const toDirection = (dto: DirectionDto): Direction => ({
  id: dto.directionId,
  address: text(dto.address),
  neighborhood: text(dto.neighborhood),
  city: text(dto.city),
  department: text(dto.department),
  country: text(dto.country),
  additionalInfo: text(dto.additionalInfo),
})

// un id en 0 significa "no aplica a esto" en el backend: se deja sin definir
const idOrUndefined = (value: number | undefined): number | undefined => (value ? value : undefined)

export const toDiscount = (dto: DiscountDto): Discount => ({
  id: dto.discountId,
  brandId: idOrUndefined(dto.brandId),
  categoryId: idOrUndefined(dto.categoryId),
  modelId: idOrUndefined(dto.modelId),
  productId: idOrUndefined(dto.productId),
  quantity: dto.quantity ?? 0,
  price: dto.price ?? 0,
  rate: dto.rate ?? 0,
  isActive: dto.isActive !== false,
})

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
