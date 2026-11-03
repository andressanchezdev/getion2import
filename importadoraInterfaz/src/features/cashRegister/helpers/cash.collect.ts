// cash.collect · reglas puras del cobro mixto de un pedido en Caja: cuánto falta por cubrir, cuándo una línea de pago es válida y cómo se arma lo que se envía
// conecta con: useCashCollect (valida y envía), CashCollectPanel y CashOrdersPanel (cuándo se ofrece «Cobrar»); no toca el store
// ojo: el crédito no es un pago: es la parte que el cliente deja a deber; el efectivo exige turno abierto y la transferencia exige referencia y foto del comprobante
import type { CollectLine, CollectLineMethod, CollectPaymentInput } from '../types/cash.types'

export const COLLECT_METHOD_LABELS: Record<CollectLineMethod, string> = { cash: 'Efectivo', transfer: 'Transferencia', credit: 'Crédito' }

// lo que falta por cubrir del pedido: total - verificado - dejado a crédito (nunca negativo)
export const remainingOf = (order: { totalAmount: number; paidAmount: number; creditAmount: number }): number => Math.max(order.totalAmount - order.paidAmount - order.creditAmount, 0)

// «Cobrar» se ofrece si el pago no está cubierto y no es un pedido por transferencia (esa transferencia ya nació en revisión: se aprueba en el detalle)
export const canCollect = (order: { paymentMethod: string; paymentVerified: boolean }): boolean => !order.paymentVerified && order.paymentMethod.toLowerCase() !== 'transfer'

export const emptyLine = (amount: number): CollectLine => ({ method: 'cash', amount, reference: '', bank: '', proofUrl: '', fileName: '' })

export const sumLines = (lines: CollectLine[]): number => lines.reduce((sum, line) => sum + line.amount, 0)

// por qué una línea no se puede enviar (null si está bien)
export const lineProblem = (line: CollectLine, shiftOpen: boolean): string | null => {
  if (line.amount <= 0) return 'Pon el monto'
  if (line.method === 'cash' && !shiftOpen) return 'Abre el turno de caja para recibir efectivo'
  if (line.method === 'transfer' && line.reference.trim() === '') return 'Falta la referencia del comprobante'
  if (line.method === 'transfer' && line.proofUrl === '') return 'Falta la foto del comprobante'
  return null
}

// por qué el cobro completo no se puede enviar (null si está bien)
export const collectProblem = (lines: CollectLine[], remaining: number, shiftOpen: boolean): string | null => {
  if (lines.length === 0) return 'Agrega al menos un pago'
  const broken = lines.map((line) => lineProblem(line, shiftOpen)).find(Boolean)
  if (broken) return broken
  if (sumLines(lines) > remaining) return 'Los pagos superan lo que falta por cubrir'
  return null
}

// lo que se envía al API: el crédito va como línea sin comprobante; la transferencia lleva referencia, banco y foto
export const toCollectInput = (saleId: number, lines: CollectLine[]): CollectPaymentInput => ({
  saleId,
  payments: lines.map((line) => ({
    method: line.method,
    amount: line.amount,
    ...(line.method === 'transfer' ? { reference: line.reference.trim(), proofUrl: line.proofUrl, ...(line.bank.trim() ? { bank: line.bank.trim() } : {}) } : {}),
  })),
})
