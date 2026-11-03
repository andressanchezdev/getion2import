// wallet.adapter · convierte lo que responde la API en Go en cartera (clientes, ventas a crédito y reporte) a lo que usa la app
// conecta con: wallet.service (lo aplica a cada respuesta); es el único lugar que conoce los nombres del backend en cartera
// ojo: SUPUESTOS a confirmar con datos reales: (1) cupo usado = cupo - cupo disponible (incluye lo reservado por pedidos en curso: la lista no lo separa);
// (2) la deuda total sale del reporte de cartera (la API la manda negativa); (3) una venta a crédito sin fecha de vencimiento vence el día que se vendió
import type { CreditCustomerDto, PaymentHistoryDto, WalletCustomerDto, WalletReportDto, WalletSaleDto } from '../types/wallet.api.types'
import type { AbonoRecord, CreditCustomerOption, CreditInvoice, CreditStatus, CustomerCreditProfile, WalletSummary } from '../types/wallet.types'

const DAY_MS = 24 * 60 * 60 * 1000

const money = (value: number | undefined | null): number => (Number.isFinite(value) ? (value as number) : 0)

// el cupo disponible de cada cliente (id → cupo), que sale de GET /customers/selector
export type AvailableCreditById = Map<number, number>

// sin crédito → "blocked"; con deuda → "withBalance"; el resto → "upToDate"
const statusOf = (isCredit: boolean, usedCredit: number): CreditStatus => {
  if (!isCredit) return 'blocked'
  return usedCredit > 0 ? 'withBalance' : 'upToDate'
}

// nombre del cliente de cartera: nombre y apellido, o el nombre comercial, o «Cliente» con su id
const nameOf = (dto: WalletCustomerDto): string =>
  `${dto.name ?? ''} ${dto.lastName ?? ''}`.trim() || (dto.tradeName ?? '').trim() || `Cliente ${dto.id}`

// convierte un cliente de la API en su perfil de crédito, con su cupo disponible
export const toCustomerCredit = (dto: WalletCustomerDto, available: AvailableCreditById): CustomerCreditProfile => {
  const creditLimit = money(dto.creditLimit)
  const isCredit = dto.creditEnabled === true
  const availableCredit = Math.min(creditLimit, Math.max(0, available.get(dto.id) ?? creditLimit))
  const usedCredit = Math.max(0, creditLimit - availableCredit)
  return {
    id: dto.id,
    documentId: (dto.document ?? '').trim(),
    businessName: nameOf(dto),
    creditDays: money(dto.creditDays),
    isCredit,
    creditLimit,
    usedCredit,
    reservedCredit: 0,
    availableCredit,
    creditStatus: statusOf(isCredit, usedCredit),
  }
}

// las tarjetas de arriba: se arman con todos los clientes con crédito y el reporte de cartera
export const toWalletSummary = (customers: WalletCustomerDto[], available: AvailableCreditById, report: WalletReportDto): WalletSummary => {
  const withCredit = customers.filter((customer) => customer.creditEnabled === true)
  const days = withCredit.map((customer) => money(customer.creditDays))
  return {
    totalCreditExtended: withCredit.reduce((sum, customer) => sum + money(customer.creditLimit), 0),
    totalOutstandingDebt: Math.abs(money(report.totalOutstandingDebt)),
    totalAvailableCredit: withCredit.reduce((sum, customer) => sum + (available.get(customer.id) ?? money(customer.creditLimit)), 0),
    customersOverdue: withCredit.filter((customer) => customer.status === 'overdue').length,
    totalCustomersWithCredit: Math.max(withCredit.length, money(report.totalCustomersWithCredit)),
    averageCreditDays: days.length === 0 ? 0 : Math.round(days.reduce((sum, value) => sum + value, 0) / days.length),
  }
}

// milisegundos de una fecha o fecha-hora; si no es válida devuelve null
const timeOf = (value: string | null | undefined): number | null => {
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

// venta a crédito → factura de cartera; `now` se puede pasar para que el cálculo de mora sea el mismo en las pruebas
export const toInvoice = (dto: WalletSaleDto, now: number = Date.now()): CreditInvoice => {
  const issuedMs = timeOf(dto.saleAt) ?? timeOf(dto.createdAt) ?? now
  const dueMs = timeOf(dto.dueDate) ?? issuedMs
  const totalAmount = money(dto.total)
  const paidAmount = money(dto.paidTotal)
  const pendingBalance = Math.max(0, totalAmount - paidAmount)
  const daysOverdue = pendingBalance > 0 ? Math.max(0, Math.floor((now - dueMs) / DAY_MS)) : 0
  return {
    id: String(dto.id),
    saleId: dto.id,
    invoiceNumber: (dto.serialCode ?? '').trim() || `#${dto.id}`,
    orderNumber: `Venta ${dto.id}`,
    issueDate: new Date(issuedMs).toISOString().slice(0, 10),
    dueDate: new Date(dueMs).toISOString().slice(0, 10),
    totalAmount,
    paidAmount,
    pendingBalance,
    daysOverdue,
    status: pendingBalance <= 0 ? 'paid' : daysOverdue > 0 ? 'overdue' : 'current',
  }
}

const ABONO_STATUSES: AbonoRecord['status'][] = ['verified', 'pending', 'void']

// el backend llama «review» al pago que espera verificación (en la pantalla es «pending», en revisión) y «voided» al anulado («void»)
const abonoStatusOf = (status?: string): AbonoRecord['status'] => (status === 'review' ? 'pending' : status === 'voided' ? 'void' : ABONO_STATUSES.includes(status as AbonoRecord['status']) ? (status as AbonoRecord['status']) : 'verified')

// un pago del historial: recibo, cliente, venta, método, referencia, monto y estado (lo que el backend no trae se rellena con un texto neutro)
export const toAbonoRecord = (dto: PaymentHistoryDto, index: number): AbonoRecord => {
  const id = Number(dto.id ?? index + 1)
  return {
    id,
    serialCode: dto.serialCode || dto.serialPayment || `REC-${1000 + id}`,
    date: (dto.createdAt || dto.date || '').slice(0, 10),
    customerName: dto.customerName || dto.userName || 'Cliente general',
    customerDoc: dto.customerDoc || dto.identification || 'N/A',
    saleSerial: dto.saleSerial || (dto.saleId ? `PD-${dto.saleId}` : 'Abono a cartera'),
    method: String(dto.paymentMethod || dto.method || 'cash').toLowerCase(),
    reference: dto.reference || undefined,
    amount: money(dto.amount),
    status: abonoStatusOf(dto.status),
    saleId: dto.saleId || undefined,
    warehouseId: dto.warehouseId || undefined,
    warehouseCode: dto.warehouseCode || undefined,
    warehouseName: dto.warehouseName || undefined,
    employeeName: dto.employeeName || undefined,
    verifiedByName: dto.verifiedByName || undefined,
    proofUrl: dto.proofUrl || undefined,
    note: dto.issueNote || undefined,
  }
}

// un cliente de la búsqueda para habilitarle crédito
export const toCreditCustomerOption = (dto: CreditCustomerDto): CreditCustomerOption => ({
  id: Number(dto.id),
  name: dto.businessName || dto.name || dto.contactName || 'Sin nombre',
  identification: dto.identification || dto.document || '',
  email: dto.email || undefined,
  creditLimit: money(dto.creditLimit),
  creditDays: money(dto.creditDays) || 30,
  isCredit: Boolean(dto.isCredit || dto.creditEnabled),
})
