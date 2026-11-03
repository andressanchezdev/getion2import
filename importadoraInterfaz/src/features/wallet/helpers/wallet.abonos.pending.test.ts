// wallet.abonos.pending.test · pruebas de las facturas con saldo y de lo que debe un cliente (lo que usa el formulario de abono)
// conecta con: wallet.abonos (pendingInvoices, debtOf); se corre con npm test
import { describe, expect, it } from 'vitest'
import { debtOf, pendingInvoices } from './wallet.abonos'
import type { CreditInvoice } from '../types/wallet.types'

const invoice = (saleId: number, issueDate: string, pendingBalance: number): CreditInvoice => ({
  id: String(saleId),
  saleId,
  invoiceNumber: `#${saleId}`,
  orderNumber: `Pedido ${saleId}`,
  issueDate,
  dueDate: issueDate,
  totalAmount: 1000,
  paidAmount: 1000 - pendingBalance,
  pendingBalance,
  daysOverdue: 0,
  status: pendingBalance > 0 ? 'current' : 'paid',
})

describe('pendingInvoices y debtOf', () => {
  const invoices = [invoice(2, '2026-10-20', 300), invoice(1, '2026-10-01', 500), invoice(3, '2026-10-25', 0)]

  it('deja solo las facturas con saldo, la más antigua primero', () => {
    expect(pendingInvoices(invoices).map((i) => i.saleId)).toEqual([1, 2])
  })

  it('suma lo que el cliente debe', () => {
    expect(debtOf(pendingInvoices(invoices))).toBe(800)
    expect(debtOf([])).toBe(0)
  })
})
