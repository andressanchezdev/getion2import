// returns.helpers.test · filtros, conteos y armado de renglones a devolver
import { describe, expect, it } from 'vitest'
import { clampQuantity, countReturns, filterReturns, initialPicks, picksToItems } from './returns.helpers'
import type { ReturnDto, SaleOption } from '../types/returns.types'

const ret = (over: Partial<ReturnDto>): ReturnDto => ({
  id: 1, saleId: 10, customerId: 2, reason: 'Falla', resolutionType: 'exchange', status: 'pending', total: 1000, createdAt: '2026-01-01', ...over,
})

const list = [
  ret({ id: 1, saleSerial: 'FAC-1', customerName: 'Ana' }),
  ret({ id: 2, status: 'approved', resolutionType: 'credit_balance', customerName: 'Beto' }),
  ret({ id: 3, status: 'rejected', warehouseName: 'Norte' }),
]

describe('filterReturns', () => {
  it('sin filtros devuelve todo', () => expect(filterReturns(list, 'all', '')).toHaveLength(3))
  it('filtra por estado', () => expect(filterReturns(list, 'approved', '').map((r) => r.id)).toEqual([2]))
  it('busca por factura, cliente, bodega y número de caso', () => {
    expect(filterReturns(list, 'all', 'fac-1').map((r) => r.id)).toEqual([1])
    expect(filterReturns(list, 'all', 'beto').map((r) => r.id)).toEqual([2])
    expect(filterReturns(list, 'all', 'norte').map((r) => r.id)).toEqual([3])
    expect(filterReturns(list, 'all', '3').map((r) => r.id)).toEqual([3])
  })
  it('combina estado y búsqueda', () => expect(filterReturns(list, 'pending', 'beto')).toEqual([]))
})

describe('countReturns', () => {
  it('cuenta por estado y por resolución', () => {
    expect(countReturns(list)).toEqual({ total: 3, pending: 1, approved: 1, rejected: 1, exchange: 2, creditBalance: 1 })
  })
})

describe('renglones a devolver', () => {
  const sale: SaleOption = {
    id: 10, serial: 'FAC-1', customerName: 'Ana', total: 5, createdAt: '',
    items: [
      { id: 7, productId: 1, productName: 'A', quantity: 3, unitPrice: 1, lineTotal: 3 },
      { id: 8, productId: 2, productName: 'B', quantity: 0, unitPrice: 1, lineTotal: 0 },
    ],
  }
  it('marca todos con su cantidad vendida (mínimo 1)', () => {
    expect(initialPicks(sale)).toEqual({ 7: { selected: true, quantity: 3 }, 8: { selected: true, quantity: 1 } })
  })
  it('limita la cantidad entre 1 y lo vendido', () => {
    expect(clampQuantity(0, 3)).toBe(1)
    expect(clampQuantity(9, 3)).toBe(3)
    expect(clampQuantity(2, 3)).toBe(2)
  })
  it('solo manda los marcados y siempre repone stock', () => {
    expect(picksToItems({ 7: { selected: true, quantity: 2 }, 8: { selected: false, quantity: 1 } })).toEqual([{ saleItemId: 7, quantity: 2, restock: true }])
  })
})
