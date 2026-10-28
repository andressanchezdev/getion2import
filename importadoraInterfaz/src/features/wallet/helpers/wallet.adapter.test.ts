// wallet.adapter.test · pruebas de la conversión de clientes con crédito, facturas y resumen del backend
// conecta con: wallet.adapter; se corre con npm test
import { describe, expect, it } from 'vitest'
import { toCustomerCredit, toInvoice, toWalletSummary } from './wallet.adapter'

describe('toCustomerCredit', () => {
  const base = { userId: 9, name: 'Ana', lastName: 'Pérez', identification: ' 123 ', isCredit: true, creditAmount: 1000, creditDays: 30 }

  it('convierte los datos básicos', () => {
    expect(toCustomerCredit(base)).toMatchObject({ id: 9, documentId: '123', businessName: 'Ana Pérez', creditDays: 30, isCredit: true, creditLimit: 1000 })
  })

  it('el saldo adeudado es lo vendido menos los pagos verificados', () => {
    expect(toCustomerCredit({ ...base, sumAmount: 700, verifiedPayments: 200 }).usedCredit).toBe(500)
  })

  it('el saldo nunca es negativo', () => {
    expect(toCustomerCredit({ ...base, sumAmount: 100, verifiedPayments: 500 }).usedCredit).toBe(0)
  })

  it('el cupo disponible es cupo menos saldo menos reservado, sin bajar de 0', () => {
    expect(toCustomerCredit({ ...base, sumAmount: 300, reservedCredit: 200 }).availableCredit).toBe(500)
    expect(toCustomerCredit({ ...base, sumAmount: 900, reservedCredit: 500 }).availableCredit).toBe(0)
  })

  it('estado: sin crédito = blocked; con deuda = withBalance; sin deuda = upToDate', () => {
    expect(toCustomerCredit({ ...base, isCredit: false }).creditStatus).toBe('blocked')
    expect(toCustomerCredit({ ...base, sumAmount: 10 }).creditStatus).toBe('withBalance')
    expect(toCustomerCredit({ ...base, sumAmount: 0 }).creditStatus).toBe('upToDate')
  })

  it('sin nombre usa el número de usuario y los campos que faltan quedan en 0', () => {
    const customer = toCustomerCredit({ userId: 4 })
    expect(customer.businessName).toBe('Usuario 4')
    expect(customer).toMatchObject({ creditLimit: 0, usedCredit: 0, reservedCredit: 0, creditDays: 0, isCredit: false })
  })
})

describe('toWalletSummary', () => {
  it('convierte los totales y deja en 0 lo que falta', () => {
    expect(toWalletSummary({ totalCreditExtended: 5000, totalOutstandingDebt: 1200, customersOverdue: 3, averageCreditDays: 28.5 })).toEqual({
      totalCreditExtended: 5000,
      totalOutstandingDebt: 1200,
      totalAvailableCredit: 0,
      customersOverdue: 3,
      totalCustomersWithCredit: 0,
      averageCreditDays: 28.5,
    })
  })
})

describe('toInvoice', () => {
  const NOW = new Date('2026-10-20T12:00:00Z').getTime()
  const bill = { saleId: 55, serialCode: 1234, created_at: '2026-09-01T10:00:00Z', creditDays: 30, totalAmount: 1000, verifiedPayments: 250 }

  it('arma número, pedido, fechas y saldos', () => {
    expect(toInvoice(bill, NOW)).toMatchObject({
      id: '55',
      saleId: 55,
      invoiceNumber: '#1234',
      orderNumber: 'Venta 55',
      issueDate: '2026-09-01',
      dueDate: '2026-10-01',
      totalAmount: 1000,
      paidAmount: 250,
      pendingBalance: 750,
    })
  })

  it('vencida: calcula los días de mora desde el vencimiento', () => {
    const invoice = toInvoice(bill, NOW)
    expect(invoice.status).toBe('overdue')
    expect(invoice.daysOverdue).toBe(19)
  })

  it('vigente: aún no vence', () => {
    const invoice = toInvoice({ ...bill, created_at: '2026-10-10T10:00:00Z' }, NOW)
    expect(invoice).toMatchObject({ status: 'current', daysOverdue: 0 })
  })

  it('pagada: sin saldo no hay mora', () => {
    expect(toInvoice({ ...bill, verifiedPayments: 1000 }, NOW)).toMatchObject({ status: 'paid', pendingBalance: 0, daysOverdue: 0 })
  })

  it('sin número de serie usa el número de venta; sin fecha usa hoy', () => {
    const invoice = toInvoice({ saleId: 7, totalAmount: 10 }, NOW)
    expect(invoice.invoiceNumber).toBe('#7')
    expect(invoice.issueDate).toBe('2026-10-20')
  })
})
