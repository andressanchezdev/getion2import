// checkout.totals.test · neto, descuento, IVA y total del checkout, con la misma regla que el backend (descuento primero, IVA sobre lo que queda)
import { describe, expect, it } from 'vitest'
import { computeTotals } from './checkout.adapter'
import type { CheckoutLine } from '../types/checkout.types'

const line = (unitPrice: number, quantity: number, ivaPercent?: number): CheckoutLine => ({ productId: 1, stockId: 1, name: 'P', unitPrice, quantity, ivaPercent })

describe('computeTotals', () => {
  it('suma el IVA del 19 % sobre el neto', () => {
    expect(computeTotals([line(50000, 2, 19)], 0)).toEqual({ subtotal: 100000, discount: 0, iva: 19000, total: 119000 })
  })
  it('un producto exento no suma IVA', () => {
    expect(computeTotals([line(50000, 2, 0)], 0)).toEqual({ subtotal: 100000, discount: 0, iva: 0, total: 100000 })
  })
  it('mezcla productos con y sin IVA', () => {
    expect(computeTotals([line(10000, 1, 19), line(10000, 1, 5), line(10000, 1, 0)], 0)).toEqual({ subtotal: 30000, discount: 0, iva: 2400, total: 32400 })
  })
  it('el descuento va primero y el IVA se calcula sobre lo que queda', () => {
    // 100.000 − 10 % = 90.000; IVA 19 % = 17.100; total 107.100
    expect(computeTotals([line(50000, 2, 19)], 10)).toEqual({ subtotal: 100000, discount: 10000, iva: 17100, total: 107100 })
  })
  it('sin renglones todo es cero', () => {
    expect(computeTotals([], 5)).toEqual({ subtotal: 0, discount: 0, iva: 0, total: 0 })
  })
  it('un renglón sin dato de IVA se trata como exento', () => {
    expect(computeTotals([line(1000, 3)], 0).total).toBe(3000)
  })
})
