// wallet.adapter · convierte lo que responde el backend en cartera (clientes, facturas y resumen) a lo que usa la app
// conecta con: wallet.service (lo aplica a cada respuesta); es el único lugar que conoce los nombres del backend en cartera
// ojo: SUPUESTOS a confirmar con datos reales: (1) saldo adeudado = sumAmount - verifiedPayments (un pago registrado pero sin verificar todavía no baja la deuda);
// (2) cupo disponible = cupo - saldo - reservado; (3) el vencimiento de una factura es su fecha + creditDays
import type { WalletBillDto, WalletSummaryDto, WalletUserDto } from '../types/wallet.api.types'
import type { CreditInvoice, CreditStatus, CustomerCreditProfile, WalletSummary } from '../types/wallet.types'

const DAY_MS = 24 * 60 * 60 * 1000

const money = (value: number | undefined): number => (Number.isFinite(value) ? (value as number) : 0)

// sin crédito → "blocked"; con deuda → "withBalance"; el resto → "upToDate"
const statusOf = (isCredit: boolean, usedCredit: number): CreditStatus => {
  if (!isCredit) return 'blocked'
  return usedCredit > 0 ? 'withBalance' : 'upToDate'
}

export const toCustomerCredit = (dto: WalletUserDto): CustomerCreditProfile => {
  const creditLimit = money(dto.creditAmount)
  const usedCredit = Math.max(0, money(dto.sumAmount) - money(dto.verifiedPayments))
  const reservedCredit = money(dto.reservedCredit)
  const isCredit = dto.isCredit === true
  return {
    id: dto.userId,
    documentId: (dto.identification ?? '').trim(),
    businessName: `${dto.name ?? ''} ${dto.lastName ?? ''}`.trim() || `Usuario ${dto.userId}`,
    creditDays: money(dto.creditDays),
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
export const toInvoice = (dto: WalletBillDto, now: number = Date.now()): CreditInvoice => {
  const issued = dto.created_at ? new Date(dto.created_at) : null
  const issuedMs = issued && !Number.isNaN(issued.getTime()) ? issued.getTime() : now
  const dueMs = issuedMs + money(dto.creditDays) * DAY_MS
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
