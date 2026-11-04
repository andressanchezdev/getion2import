// checkout.blockers · por qué el panel de finalizar compra no deja continuar, en frases que el usuario entiende
// conecta con: useCheckoutFlow (calcula la lista) y CheckoutPanel (la muestra junto al botón); con pruebas en checkout.blockers.test.ts
// ojo: antes el botón quedaba gris sin decir cuál campo faltaba; el teléfono se acepta con +57, espacios o guiones y se guarda solo con los 10 dígitos
import type { DeliveryData } from '../types/checkout.types'

const PHONE_DIGITS = 10

// deja solo los dígitos; un número colombiano con prefijo 57 (12 dígitos) vuelve a 10
export const normalizePhone = (value: string): string => {
  const digits = value.replace(/\D/g, '')
  return digits.length === PHONE_DIGITS + 2 && digits.startsWith('57') ? digits.slice(2) : digits
}

export interface BlockerInput {
  hasCustomer: boolean
  linesCount: number | null // null = todavía cargando
  delivery: DeliveryData
  deliveryRequired: boolean // las cotizaciones no piden entrega
  needsEmployee: boolean
  employeeId: number
  onPayment: boolean
  transferMissingProof: boolean
  cashBlocked?: boolean
}

// lista de lo que falta; vacía = se puede continuar
export const checkoutBlockers = (input: BlockerInput): string[] => {
  const missing: string[] = []
  if (!input.hasCustomer) missing.push('Elige el cliente.')
  if (input.linesCount === null) missing.push('Preparando los productos…')
  else if (input.linesCount === 0) missing.push('No hay productos en el pedido.')
  if (input.hasCustomer && input.deliveryRequired) {
    if (input.delivery.address.trim().length < 5) missing.push('Escribe la dirección de entrega (mínimo 5 caracteres).')
    if (input.delivery.city.trim().length < 2) missing.push('Escribe la ciudad de entrega.')
    if (normalizePhone(input.delivery.phone).length !== PHONE_DIGITS) missing.push('El teléfono de contacto debe tener 10 dígitos.')
  }
  if (input.needsEmployee && input.employeeId <= 0) missing.push('Elige el empleado al que se asigna la venta.')
  if (input.onPayment && input.transferMissingProof) missing.push('Adjunta el comprobante de la transferencia.')
  if (input.onPayment && input.cashBlocked) missing.push('La caja de la bodega está cerrada: abre el turno o elige otra forma de pago.')
  return missing
}
