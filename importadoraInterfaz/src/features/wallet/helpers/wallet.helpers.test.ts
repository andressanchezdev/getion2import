// wallet.helpers.test · pruebas del uso de cupo, el monto digitado y el reparto de un abono entre facturas
// conecta con: wallet.helpers; se corre con npm test
import { describe, expect, it } from 'vitest'
import { getUsageLevel, getUsagePercentage, parsePaymentAmount, splitPayment } from './wallet.helpers'
import type { CreditInvoice } from '../types/wallet.types'

const invoice = (saleId: number, issueDate: string, pendingBalance: number): CreditInvoice => ({
  id: String(saleId),
  saleId,
  invoiceNumber: `#${saleId}`,
  orderNumber: `Venta ${saleId}`,
  issueDate,
  dueDate: issueDate,
  totalAmount: pendingBalance,
  paidAmount: 0,
  pendingBalance,
  daysOverdue: 0,
  status: 'current',
})

describe('getUsagePercentage y getUsageLevel', () => {
  it('calcula el porcentaje redondeado, con tope de 100 y 0 si no hay cupo', () => {
    expect(getUsagePercentage(250, 1000)).toBe(25)
    expect(getUsagePercentage(2000, 1000)).toBe(100)
    expect(getUsagePercentage(500, 0)).toBe(0)
  })

  it('el nivel es crítico desde 90, alerta desde 70 y normal debajo', () => {
    expect(getUsageLevel(95)).toBe('critical')
    expect(getUsageLevel(70)).toBe('warning')
    expect(getUsageLevel(69)).toBe('normal')
  })
})

describe('parsePaymentAmount', () => {
  it('deja solo los dígitos', () => {
    expect(parsePaymentAmount('1.500.000')).toBe(1500000)
  })

  it('devuelve null si no es un monto válido', () => {
    expect(parsePaymentAmount('')).toBeNull()
    expect(parsePaymentAmount('abc')).toBeNull()
    expect(parsePaymentAmount('0')).toBeNull()
  })
})

describe('splitPayment', () => {
  const invoices = [invoice(3, '2026-10-05', 300), invoice(1, '2026-09-01', 500), invoice(2, '2026-09-15', 0)]

  it('reparte de la factura más antigua a la más nueva y salta las que no tienen saldo', () => {
    expect(splitPayment(invoices, 600)).toEqual([
      { saleId: 1, amount: 500, remainingAmount: 0 },
      { saleId: 3, amount: 100, remainingAmount: 200 },
    ])
  })

  it('un abono menor al saldo de la primera factura deja el resto por pagar', () => {
    expect(splitPayment(invoices, 200)).toEqual([{ saleId: 1, amount: 200, remainingAmount: 300 }])
  })

  it('lo que sobra del total adeudado no se reparte', () => {
    const payments = splitPayment(invoices, 10000)
    expect(payments.reduce((sum, p) => sum + p.amount, 0)).toBe(800)
  })

  it('sin facturas con saldo no hay pagos', () => {
    expect(splitPayment([invoice(1, '2026-09-01', 0)], 100)).toEqual([])
  })

  it('no modifica la lista original', () => {
    const original = [invoice(3, '2026-10-05', 300), invoice(1, '2026-09-01', 500)]
    splitPayment(original, 100)
    expect(original.map((i) => i.saleId)).toEqual([3, 1])
  })
})
