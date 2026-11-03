// checkout.api.types · lo que responde la API en Go al buscar clientes (GET /customers/search, GET /customers/:id, GET /customers/selector) para armar la venta
// conecta con: checkout.adapter (convierte a CheckoutCustomer) y checkout.service; nombres del backend tal cual
export interface CheckoutAddressDto {
  id?: number
  address?: string
  neighborhood?: string
  city?: string
  department?: string
  additionalInfo?: string
}

export interface CheckoutCustomerDto {
  id: number
  name?: string
  lastName?: string | null
  tradeName?: string | null
  document?: string
  phone?: string | null
  mobile?: string | null
  address?: string | null
  city?: string | null
  addresses?: CheckoutAddressDto[] | null
  discountPercent?: number
  creditEnabled?: boolean
  creditLimit?: number
  creditDays?: number
}

// GET /customers/selector: el cupo que le queda a cada cliente
export interface CheckoutSelectorDto {
  id: number
  availableCredit?: number
}
