// checkout.adapter · convierte el cliente de la API a lo que usa el flujo de finalizar compra y calcula descuento, crédito y total; el único lugar que conoce los nombres del backend
// conecta con: checkout.service (convierte), CheckoutPanel y sus pasos (cálculos), checkout.api.types y checkout.types
import type { CheckoutCustomerDto } from '../types/checkout.api.types'
import type { CheckoutCustomer, CheckoutLine, DeliveryData } from '../types/checkout.types'

const text = (value: string | null | undefined): string => (value ?? '').trim()

// arma el nombre completo del cliente (nombre y apellido)
const fullName = (dto: CheckoutCustomerDto): string => {
  const base = [text(dto.name), text(dto.lastName)].filter(Boolean).join(' ')
  return base || text(dto.tradeName) || `Cliente ${dto.id}`
}

// las direcciones guardadas; si solo trae dirección y ciudad sueltas se arma una con ellas
const toDeliveries = (dto: CheckoutCustomerDto): DeliveryData[] => {
  const phone = text(dto.mobile) || text(dto.phone)
  const saved = (dto.addresses ?? [])
    .filter((item) => text(item.address))
    .map((item) => ({ address: [text(item.address), text(item.neighborhood)].filter(Boolean).join(', '), city: [text(item.city), text(item.department)].filter(Boolean).join(', '), phone, notes: text(item.additionalInfo) }))
  if (saved.length > 0) return saved
  return text(dto.address) ? [{ address: text(dto.address), city: text(dto.city), phone, notes: '' }] : []
}

// convierte el cliente de la API en el que usa el pago, con su cupo de crédito disponible
export const toCheckoutCustomer = (dto: CheckoutCustomerDto, availableCredit: number): CheckoutCustomer => ({
  id: dto.id,
  name: fullName(dto),
  document: text(dto.document),
  phone: text(dto.mobile) || text(dto.phone),
  discountPercent: Math.min(100, Math.max(0, Number(dto.discountPercent) || 0)),
  creditEnabled: dto.creditEnabled === true,
  availableCredit: Math.max(0, availableCredit),
  creditDays: Number(dto.creditDays) || 0,
  deliveries: toDeliveries(dto),
})

// datos de entrega con los que arranca el formulario: la primera dirección guardada o, si no hay, solo el teléfono
export const initialDelivery = (customer: CheckoutCustomer): DeliveryData =>
  customer.deliveries[0] ?? { address: '', city: '', phone: customer.phone, notes: '' }

// suma lo que cuestan los renglones (precio por cantidad)
export const linesTotal = (lines: CheckoutLine[]): number => lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)

// total con el descuento general del cliente (redondeado al peso)
export const totalWithDiscount = (total: number, discountPercent: number): number => Math.round(total * (1 - discountPercent / 100))

// el crédito solo se ofrece si el cliente lo tiene habilitado y el cupo que le queda alcanza para el total
export const canPayByCredit = (customer: CheckoutCustomer, payable: number): boolean => customer.creditEnabled && customer.availableCredit >= payable

// dirección de entrega como la guarda la API (JSON libre)
export const toShippingAddress = (delivery: DeliveryData) => ({ address: delivery.address.trim(), city: delivery.city.trim(), phone: delivery.phone.trim(), notes: delivery.notes.trim() })

// la entrega es válida con dirección, ciudad y un teléfono de 10 dígitos
export const isDeliveryValid = (delivery: DeliveryData): boolean =>
  delivery.address.trim().length >= 5 && delivery.city.trim().length >= 2 && /^\d{10}$/.test(delivery.phone.trim())
