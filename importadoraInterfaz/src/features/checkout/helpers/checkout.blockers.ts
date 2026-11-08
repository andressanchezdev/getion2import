// checkout.blockers · por qué el panel de finalizar compra no deja continuar, en frases que el usuario entiende
// conecta con: useCheckoutFlow (calcula la lista), CustomerStep (cada dato de entrega pendiente se muestra dentro de su campo) y CheckoutPanel (una línea con lo demás); con pruebas en checkout.blockers.test.ts
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

const EMPLOYEE_MESSAGE = 'Elige el empleado al que se asigna la venta.'

// lo que falta de los datos de entrega, por campo (vacío = ese campo está completo)
export const deliveryProblems = (delivery: DeliveryData): { address?: string; city?: string; phone?: string } => ({
  ...(delivery.address.trim().length < 5 ? { address: 'Escribe la dirección de entrega (mínimo 5 caracteres).' } : {}),
  ...(delivery.city.trim().length < 2 ? { city: 'Escribe la ciudad de entrega.' } : {}),
  ...(normalizePhone(delivery.phone).length !== PHONE_DIGITS ? { phone: 'El teléfono de contacto debe tener 10 dígitos.' } : {}),
})

// lo que falta y no es de un campo en particular: cliente, productos, comprobante y caja
export const generalBlockers = (input: BlockerInput): string[] => {
  const missing: string[] = []
  if (!input.hasCustomer) missing.push('Elige el cliente.')
  if (input.linesCount === null) missing.push('Preparando los productos…')
  else if (input.linesCount === 0) missing.push('No hay productos en el pedido.')
  if (input.onPayment && input.transferMissingProof) missing.push('Adjunta el comprobante de la transferencia.')
  if (input.onPayment && input.cashBlocked) missing.push('La caja de la bodega está cerrada: abre el turno o elige otra forma de pago.')
  return missing
}

// todo lo que falta para continuar (generales, datos de entrega y empleado); vacía = se puede continuar
export const checkoutBlockers = (input: BlockerInput): string[] => {
  const fields = input.hasCustomer && input.deliveryRequired ? Object.values(deliveryProblems(input.delivery)) : []
  const employee = input.needsEmployee && input.employeeId <= 0 ? [EMPLOYEE_MESSAGE] : []
  return [...generalBlockers(input), ...fields, ...employee]
}
