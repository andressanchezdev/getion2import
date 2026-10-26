// wallet.helpers · funciones puras de cartera (uso de cupo, monto del abono y reparto del abono entre facturas)
// conecta con: CreditClientsTable, CreditAccountMetrics y useCreditPayment / wallet.payments.thunks (splitPayment)
// ojo: applyPaymentToCustomer (que cambiaba el saldo a mano en el reducer) se quitó: el saldo ahora lo calcula el backend y se vuelve a leer
import type { PaymentInput } from '../types/wallet.api.types'
import type { CreditInvoice } from '../types/wallet.types'

// porcentaje de cupo usado (0 si el cupo es 0, máximo 100)
export const getUsagePercentage = (used: number, limit: number): number => {
  if (limit <= 0) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

// nivel visual de la barra de uso: crítico desde 90%, alerta desde 70%
export const getUsageLevel = (pct: number): 'critical' | 'warning' | 'normal' => {
  if (pct >= 90) return 'critical'
  if (pct >= 70) return 'warning'
  return 'normal'
}

// convierte lo digitado en el abono a número; devuelve null si no es un monto válido
export const parsePaymentAmount = (raw: string): number | null => {
  const amount = parseFloat(raw.replace(/\D/g, ''))
  if (!amount || isNaN(amount) || amount <= 0) return null
  return amount
}

// reparte un abono entre las facturas con saldo, de la más antigua a la más nueva; lo que sobre del total adeudado no se reparte
// cada pago lleva lo que queda por pagar de esa factura (remainingAmount), que es lo que pide POST /payments/register
export const splitPayment = (invoices: CreditInvoice[], amount: number): PaymentInput[] => {
  const payments: PaymentInput[] = []
  let remaining = amount
  const oldestFirst = [...invoices].sort((a, b) => a.issueDate.localeCompare(b.issueDate))
  for (const invoice of oldestFirst) {
    if (remaining <= 0) break
    if (invoice.pendingBalance <= 0) continue
    const pay = Math.min(remaining, invoice.pendingBalance)
    payments.push({ saleId: invoice.saleId, amount: pay, remainingAmount: invoice.pendingBalance - pay })
    remaining -= pay
  }
  return payments
}
