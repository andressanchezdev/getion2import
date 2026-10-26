// wallet.adapter · convierte lo que responde el backend en cartera (clientes, facturas y resumen) a lo que usa la app
// conecta con: wallet.service (lo aplica a cada respuesta); es el único lugar que conoce los nombres del backend en cartera
// ojo: la API real manda el crédito en creditInformation {quota, subtract, days}; los nombres planos (creditAmount, creditDays...) solo se leen como respaldo
// SUPUESTOS a confirmar en pantalla: (1) no se sabe si creditInformation.subtract o sumAmount es el cupo usado (el cliente 217 trae subtract 20.025.000 y sumAmount 18.706.600 con cupo 20.000.000),
// así que se toma el MAYOR de los dos (el disponible nunca queda inflado y un cliente con deuda no sale al día); (2) cupo disponible = cupo - usado - reservado;
// (3) el vencimiento de una factura es su fecha + los días de crédito del cliente; las fechas 0001-01-01 del backend significan "sin fecha"
import type { WalletBillDto, WalletSummaryDto, WalletUserDto } from '../types/wallet.api.types'
import type { CreditInvoice, CreditStatus, CustomerCreditProfile, WalletSummary } from '../types/wallet.types'

const DAY_MS = 24 * 60 * 60 * 1000

const money = (value: number | undefined): number => (Number.isFinite(value) ? (value as number) : 0)

// el backend manda 0001-01-01T00:00:00Z cuando no hay fecha
const validDate = (value: string | undefined): Date | null => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) || date.getUTCFullYear() < 2000 ? null : date
}

// sin crédito → "blocked"; con deuda → "withBalance"; el resto → "upToDate"
const statusOf = (isCredit: boolean, usedCredit: number): CreditStatus => {
  if (!isCredit) return 'blocked'
  return usedCredit > 0 ? 'withBalance' : 'upToDate'
}

export const toCustomerCredit = (dto: WalletUserDto): CustomerCreditProfile => {
  const credit = dto.creditInformation
  const creditLimit = money(credit?.quota ?? dto.creditAmount)
  const debt = money(dto.sumAmount) - money(dto.verifiedPayments)
  const usedCredit = Math.max(0, money(credit?.subtract), debt)
  const reservedCredit = money(dto.reservedCredit)
  const isCredit = dto.isCredit === true
  return {
    id: dto.userId,
    documentId: (dto.identification ?? '').trim(),
    businessName: `${dto.name ?? ''} ${dto.lastName ?? ''}`.trim() || `Usuario ${dto.userId}`,
    creditDays: money(credit?.days ?? dto.creditDays),
    isCredit,
    creditLimit,
    usedCredit,
    reservedCredit,
    availableCredit: Math.max(0, creditLimit - usedCredit - reservedCredit),
    creditStatus: statusOf(isCredit, usedCredit),
  }
}

export const toWalletSummary = (dto: WalletSummaryDto): WalletSummary => ({
  totalCreditExtended: money(dto.totalCreditExtended),
  totalOutstandingDebt: money(dto.totalOutstandingDebt),
  totalAvailableCredit: money(dto.totalAvailableCredit),
  customersOverdue: money(dto.customersOverdue),
  totalCustomersWithCredit: money(dto.totalCustomersWithCredit),
  averageCreditDays: money(dto.averageCreditDays),
})

// factura (venta a crédito); `now` se puede pasar para que el cálculo de mora sea el mismo en las pruebas
export const toInvoice = (dto: WalletBillDto, now: number = Date.now(), defaultCreditDays = 0): CreditInvoice => {
  const issuedMs = validDate(dto.created_at)?.getTime() ?? now
  const dueMs = issuedMs + money(dto.creditDays ?? defaultCreditDays) * DAY_MS
  const totalAmount = money(dto.totalAmount)
  const paidAmount = money(dto.verifiedPayments)
  const pendingBalance = Math.max(0, totalAmount - paidAmount)
  const daysOverdue = pendingBalance > 0 ? Math.max(0, Math.floor((now - dueMs) / DAY_MS)) : 0
  return {
    id: String(dto.saleId),
    saleId: dto.saleId,
    invoiceNumber: `#${dto.serialCode || dto.saleId}`,
    orderNumber: `Venta ${dto.saleId}`,
    issueDate: new Date(issuedMs).toISOString().slice(0, 10),
    dueDate: new Date(dueMs).toISOString().slice(0, 10),
    totalAmount,
    paidAmount,
    pendingBalance,
    daysOverdue,
    status: pendingBalance <= 0 ? 'paid' : daysOverdue > 0 ? 'overdue' : 'current',
  }
}
