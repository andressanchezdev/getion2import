// checkout.adapter · convierte el cliente de la API a lo que usa el flujo de finalizar compra y calcula descuento, crédito y total; el único lugar que conoce los nombres del backend
// conecta con: checkout.service (convierte), CheckoutPanel y sus pasos (cálculos), checkout.api.types y checkout.types
import type { CheckoutCustomerDto } from '../types/checkout.api.types'
import type { CheckoutCustomer, CheckoutLine, DeliveryData } from '../types/checkout.types'
import { normalizePhone } from './checkout.blockers'

const text = (value: string | null | undefined): string => (value ?? '').trim()

// arma el nombre completo del cliente (nombre y apellido)
const fullName = (dto: CheckoutCustomerDto): string => {
  const base = [text(dto.name), text(dto.lastName)].filter(Boolean).join(' ')
  return base || text(dto.tradeName) || `Cliente ${dto.id}`
}

// las direcciones guardadas; si solo trae dirección y ciudad sueltas se arma una con ellas
const toDeliveries = (dto: CheckoutCustomerDto): DeliveryData[] => {
  const phone = normalizePhone(text(dto.mobile) || text(dto.phone))
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
  creditLimit: Number(dto.creditLimit) || 0,
  availableCredit: Math.max(0, availableCredit),
  creditDays: Number(dto.creditDays) || 0,
  deliveries: toDeliveries(dto),
})

// datos de entrega con los que arranca el formulario: la primera dirección guardada o, si no hay, solo el teléfono
export const initialDelivery = (customer: CheckoutCustomer): DeliveryData =>
  customer.deliveries[0] ?? { address: '', city: '', phone: normalizePhone(customer.phone), notes: '' }

// suma lo que cuestan los renglones (precio por cantidad)
export const linesTotal = (lines: CheckoutLine[]): number => lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)

export interface CheckoutTotals {
  subtotal: number // suma neta de los renglones
  discount: number // descuento general del cliente sobre el neto
  iva: number // IVA de cada producto sobre su neto ya con descuento
  total: number // lo que paga el cliente: neto − descuento + IVA
}

// calcula neto, descuento, IVA y total como lo hace el backend: el descuento va primero y el IVA se calcula sobre lo que queda
export const computeTotals = (lines: CheckoutLine[], discountPercent: number): CheckoutTotals => {
  let subtotal = 0
  let discount = 0
  let iva = 0
  for (const line of lines) {
    const base = line.unitPrice * line.quantity
    const lineDiscount = base * (discountPercent / 100)
    subtotal += base
    discount += lineDiscount
    iva += (base - lineDiscount) * ((line.ivaPercent ?? 0) / 100)
  }
  return { subtotal: Math.round(subtotal), discount: Math.round(discount), iva: Math.round(iva), total: Math.round(subtotal - discount + iva) }
}

// total con el descuento general del cliente (redondeado al peso)
export const totalWithDiscount = (total: number, discountPercent: number): number => Math.round(total * (1 - discountPercent / 100))

// el crédito solo se ofrece si el cliente lo tiene habilitado y el cupo que le queda alcanza para el total
export const canPayByCredit = (customer: CheckoutCustomer, payable: number): boolean => customer.creditEnabled && customer.availableCredit >= payable

// dirección de entrega como la guarda la API (JSON libre)
export const toShippingAddress = (delivery: DeliveryData) => ({ address: delivery.address.trim(), city: delivery.city.trim(), phone: normalizePhone(delivery.phone), notes: delivery.notes.trim() })

// la entrega es válida con dirección, ciudad y un teléfono de 10 dígitos
export const isDeliveryValid = (delivery: DeliveryData): boolean =>
  delivery.address.trim().length >= 5 && delivery.city.trim().length >= 2 && /^\d{10}$/.test(normalizePhone(delivery.phone))

export interface CreditAlertInfo {
  shouldAlert: boolean
  usagePercent: number
  availableCredit: number
  message: string
}

// Alerta informativa si el cliente consumió más del 70% de su cupo asignado pero aún le queda saldo disponible
export const checkCreditUsageAlert = (customer: CheckoutCustomer | null | undefined): CreditAlertInfo | null => {
  if (!customer || !customer.creditEnabled || !customer.creditLimit || customer.creditLimit <= 0) {
    return null
  }
  const used = Math.max(0, customer.creditLimit - customer.availableCredit)
  const usagePercent = Math.round((used / customer.creditLimit) * 100)
  if (usagePercent >= 70 && customer.availableCredit > 0) {
    return {
      shouldAlert: true,
      usagePercent,
      availableCredit: customer.availableCredit,
      message: `Aviso de cupo: El cliente ha utilizado el ${usagePercent}% de su cupo de crédito (${customer.availableCredit.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })} restante disponible). Sugiera gestionar un abono pronto.`,
    }
  }
  return null
}
