// customers.api.types · lo que responde el backend en usuarios, direcciones y descuentos (nombres tal cual del Swagger)
// conecta con: customers.adapter (los convierte a los tipos de la app), customers.service y customers.details.service (los piden)
// ojo: la app solo usa los tipos de customers.types; estos nombres (userId, directionId, discountId...) no salen de customers.adapter y los services

export interface CompanyDto {
  businessName?: string
  tradeName?: string
  corporateName?: string
  nit?: string
  address?: string
  cityAndDepartment?: string
  phone?: number
  cellPhone?: number
  email?: string
  customerType?: string
  personType?: string
  regimeType?: string
  legalRepresentative?: string
  mailInvoicing?: string
}

export interface UserDto {
  userId: number
  name?: string
  lastName?: string
  identification?: string
  email?: string
  photo?: string
  userType?: string
  priceType?: string
  comissionRate?: number
  companyInformation?: CompanyDto | null
}

export interface DirectionDto {
  directionId: number
  address?: string
  neighborhood?: string
  city?: string
  department?: string
  country?: string
  additionalInfo?: string
}

export interface DiscountDto {
  discountId: number
  brandId?: number
  categoryId?: number
  modelId?: number
  productId?: number
  quantity?: number
  price?: number
  rate?: number
  isActive?: boolean
}
