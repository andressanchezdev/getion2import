// wallet.adapter.test · pruebas de la conversión de clientes con crédito, ventas a crédito y reporte de la API a lo que usa la app
// conecta con: wallet.adapter; se corre con npm test
import { describe, expect, it } from 'vitest'
import { toCustomerCredit, toInvoice, toWalletSummary } from './wallet.adapter'
import type { WalletCustomerDto } from '../types/wallet.api.types'

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.parse('2026-10-30T12:00:00Z')

const customer = (over: Partial<WalletCustomerDto> = {}): WalletCustomerDto => ({
  id: 7, document: ' 900123 ', name: 'Taller', lastName: 'El Pistón', creditEnabled: true, creditLimit: 1_000_000, creditDays: 30, ...over,
})

describe('toCustomerCredit', () => {
  it('el cupo usado es el cupo menos lo que le queda disponible', () => {
    const profile = toCustomerCredit(customer(), new Map([[7, 600_000]]))
    expect(profile).toMatchObject({ id: 7, documentId: '900123', businessName: 'Taller El Pistón', creditDays: 30, isCredit: true, creditLimit: 1_000_000, usedCredit: 400_000, availableCredit: 600_000, creditStatus: 'withBalance' })
  })

  it('sin deuda queda al día y el disponible no pasa del cupo', () => {
    expect(toCustomerCredit(customer(), new Map([[7, 5_000_000]]))).toMatchObject({ usedCredit: 0, availableCredit: 1_000_000, creditStatus: 'upToDate' })
  })

  it('sin dato de cupo disponible se asume todo el cupo libre', () => {
    expect(toCustomerCredit(customer(), new Map())).toMatchObject({ availableCredit: 1_000_000, usedCredit: 0 })
  })

  it('sin crédito habilitado queda bloqueado', () => {
    expect(toCustomerCredit(customer({ creditEnabled: false }), new Map()).creditStatus).toBe('blocked')
  })

  it('sin nombre usa el nombre comercial y, si tampoco hay, el número de cliente', () => {
    expect(toCustomerCredit(customer({ name: '', lastName: null, tradeName: 'Motos Ávila' }), new Map()).businessName).toBe('Motos Ávila')
    expect(toCustomerCredit({ id: 9 }, new Map()).businessName).toBe('Cliente 9')
  })
})

describe('toWalletSummary', () => {
  const list = [customer({ id: 1, creditLimit: 1_000_000, creditDays: 30 }), customer({ id: 2, creditLimit: 500_000, creditDays: 45, status: 'overdue' }), customer({ id: 3, creditEnabled: false })]
  const available = new Map([[1, 700_000], [2, 100_000]])

  it('arma las tarjetas con los clientes con crédito y el reporte de cartera (la deuda llega negativa)', () => {
    expect(toWalletSummary(list, available, { totalOutstandingDebt: -750_000, totalCustomersWithCredit: 2 })).toEqual({
      totalCreditExtended: 1_500_000,
      totalOutstandingDebt: 750_000,
      totalAvailableCredit: 800_000,
      customersOverdue: 1,
      totalCustomersWithCredit: 2,
      averageCreditDays: 38,
    })
  })

  it('sin clientes todo queda en 0', () => {
    expect(toWalletSummary([], new Map(), {})).toEqual({ totalCreditExtended: 0, totalOutstandingDebt: 0, totalAvailableCredit: 0, customersOverdue: 0, totalCustomersWithCredit: 0, averageCreditDays: 0 })
  })
})

describe('toInvoice', () => {
  const sale = { id: 5, serialCode: 'PD-1234', total: 100_000, paidTotal: 40_000, saleAt: '2026-10-01T10:00:00Z', dueDate: '2026-10-31' }

  it('una venta con saldo y el plazo vigente queda «al corriente»', () => {
    expect(toInvoice(sale, NOW)).toMatchObject({ id: '5', saleId: 5, invoiceNumber: 'PD-1234', orderNumber: 'Venta 5', issueDate: '2026-10-01', dueDate: '2026-10-31', pendingBalance: 60_000, paidAmount: 40_000, daysOverdue: 0, status: 'current' })
  })

  it('pasado el vencimiento y con saldo está vencida, con los días de mora', () => {
    const invoice = toInvoice({ ...sale, dueDate: '2026-10-20' }, NOW)
    expect(invoice.status).toBe('overdue')
    expect(invoice.daysOverdue).toBe(Math.floor((NOW - Date.parse('2026-10-20')) / DAY))
  })

  it('pagada del todo queda «paid» y sin mora aunque ya venció', () => {
    expect(toInvoice({ ...sale, paidTotal: 100_000, dueDate: '2026-01-01' }, NOW)).toMatchObject({ status: 'paid', pendingBalance: 0, daysOverdue: 0 })
  })

  it('sin consecutivo usa #id; sin fecha de venta usa la de creación; sin vencimiento vence el día de la venta', () => {
    const invoice = toInvoice({ id: 8, total: 10, createdAt: '2026-10-05T00:00:00Z' }, NOW)
    expect(invoice).toMatchObject({ invoiceNumber: '#8', issueDate: '2026-10-05', dueDate: '2026-10-05' })
  })
})
