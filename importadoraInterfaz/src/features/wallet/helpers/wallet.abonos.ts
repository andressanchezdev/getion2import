// wallet.abonos · filtra el historial de abonos por texto, método y estado, y suma lo recaudado
// conecta con: AbonosTable (la usa), wallet.types (AbonoRecord, AbonoFilters)
import type { AbonoFilters, AbonoRecord, CreditInvoice } from '../types/wallet.types'

export const filterAbonos = (items: AbonoRecord[], filters: AbonoFilters): AbonoRecord[] => {
  const q = filters.query.trim().toLowerCase()
  return items.filter((p) => {
    const matchQuery = !q || [p.serialCode, p.customerName, p.customerDoc, p.saleSerial, p.reference, p.warehouseCode].some((text) => text?.toLowerCase().includes(q))
    const matchWarehouse = !filters.warehouse || filters.warehouse === 'all' || String(p.warehouseId) === filters.warehouse || p.warehouseCode === filters.warehouse
    return matchQuery && matchWarehouse && (filters.method === 'all' || p.method === filters.method) && (filters.status === 'all' || p.status === filters.status)
  })
}

// suma los montos de los abonos
export const totalAbonos = (items: AbonoRecord[]): number => items.reduce((sum, p) => sum + p.amount, 0)

// dice si hay algún filtro puesto
export const hasAbonoFilters = (filters: AbonoFilters): boolean => filters.query !== '' || filters.method !== 'all' || filters.status !== 'all' || (Boolean(filters.warehouse) && filters.warehouse !== 'all')

// las facturas a crédito que todavía tienen saldo, la más antigua primero (así se abona a la que vence antes)
export const pendingInvoices = (invoices: CreditInvoice[]): CreditInvoice[] => invoices.filter((invoice) => invoice.pendingBalance > 0).sort((a, b) => a.issueDate.localeCompare(b.issueDate))

// lo que el cliente debe en total: la suma de los saldos de sus facturas
export const debtOf = (invoices: CreditInvoice[]): number => invoices.reduce((sum, invoice) => sum + invoice.pendingBalance, 0)
