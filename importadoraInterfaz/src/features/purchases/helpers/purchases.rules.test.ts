// purchases.rules.test · pruebas de las reglas de compras: pendiente, recibir, anular, validación y totales; y del adaptador de la API
// conecta con: purchases.rules y purchases.adapter; se corre con npm test
import { describe, expect, it } from 'vitest'
import { filterPurchases, toPurchase } from './purchases.adapter'
import { canPay, canReceive, canVoid, draftProblem, draftTotals, payProblem, pendingOf, pendingToPay, receiveProblem } from './purchases.rules'
import type { PurchaseItem } from '../types/purchases.types'

const item = (over: Partial<PurchaseItem>): PurchaseItem => ({ id: 1, productId: 5, productCode: 'A-1', productName: 'Pastillas', supplierCode: '', quantity: 10, receivedQty: 4, unitCost: 1000, ivaPercent: 19, subtotal: 10000, ...over })

describe('pendiente, recibir y anular', () => {
  it('pendiente es lo pedido menos lo recibido, nunca negativo', () => {
    expect(pendingOf(item({}))).toBe(6)
    expect(pendingOf(item({ receivedQty: 12 }))).toBe(0)
  })

  it('se recibe si está pedida o recibida en parte', () => {
    expect(['ordered', 'partial', 'received', 'voided', 'draft'].map((status) => canReceive({ status: status as never }))).toEqual([true, true, false, false, false])
  })

  it('solo se anula una pedida sin nada recibido', () => {
    expect(canVoid({ status: 'ordered', items: [item({ receivedQty: 0 })] })).toBe(true)
    expect(canVoid({ status: 'ordered', items: [item({ receivedQty: 1 })] })).toBe(false)
    expect(canVoid({ status: 'partial', items: [item({ receivedQty: 0 })] })).toBe(false)
  })
})

describe('receiveProblem', () => {
  const items = [item({ id: 1 }), item({ id: 2, productName: 'Filtro', receivedQty: 0 })]

  it('exige al menos una cantidad, no pasar de lo pendiente y una ubicación', () => {
    expect(receiveProblem(items, [{ purchaseItemId: 1, quantity: 0, location: 'E1' }])).toMatch(/al menos/)
    expect(receiveProblem(items, [{ purchaseItemId: 1, quantity: 7, location: 'E1' }])).toMatch(/más de lo pendiente/)
    expect(receiveProblem(items, [{ purchaseItemId: 1, quantity: 3, location: ' ' }])).toMatch(/ubicación/)
    expect(receiveProblem(items, [{ purchaseItemId: 1, quantity: 3, location: 'E1' }, { purchaseItemId: 2, quantity: 10, location: 'E2' }])).toBeNull()
  })
})

describe('orden nueva', () => {
  const lines = [
    { productId: 1, productCode: 'A', productName: 'Pastillas', quantity: 10, unitCost: 1000, ivaPercent: 19 },
    { productId: 2, productCode: 'B', productName: 'Filtro', quantity: 5, unitCost: 2000, ivaPercent: 0 },
  ]

  it('suma subtotal, IVA y total', () => {
    expect(draftTotals(lines)).toEqual({ subtotal: 20000, iva: 1900, total: 21900 })
  })

  it('pide proveedor, productos, cantidad y costo', () => {
    expect(draftProblem(0, lines)).toMatch(/proveedor/)
    expect(draftProblem(3, [])).toMatch(/al menos un producto/)
    expect(draftProblem(3, [{ ...lines[0], unitCost: 0 }])).toMatch(/costo/)
    expect(draftProblem(3, lines)).toBeNull()
  })
})

describe('adaptador', () => {
  it('convierte la orden y deja neutro lo que falta', () => {
    const purchase = toPurchase({ id: 9, serialCode: 'OC-9', supplierId: 3, supplierName: ' Bajaj ', warehouseId: 1, status: 'raro', total: 1190, createdAt: '2026-11-01T10:00:00Z' })
    expect(purchase).toMatchObject({ serial: 'OC-9', supplierName: 'Bajaj', status: 'draft', expectedDate: '', createdAt: '2026-11-01', items: [], employeeName: '—' })
  })

  it('filtra por texto y por estado', () => {
    const a = toPurchase({ id: 1, serialCode: 'OC-1', supplierId: 1, supplierName: 'Bajaj Motos', warehouseId: 1, status: 'ordered', supplierRef: 'FAC-77' })
    const b = toPurchase({ id: 2, serialCode: 'OC-2', supplierId: 2, supplierName: 'Japón Repuestos', warehouseId: 1, status: 'received' })
    expect(filterPurchases([a, b], 'japon', 'all').map((p) => p.id)).toEqual([2])
    expect(filterPurchases([a, b], 'fac-77', 'all').map((p) => p.id)).toEqual([1])
    expect(filterPurchases([a, b], '', 'received').map((p) => p.id)).toEqual([2])
  })
})

describe('pago de la recepción', () => {
  const received = { status: 'received' as const, total: 119_000, paidTotal: 20_000 }

  it('lo pendiente es el total menos lo pagado y solo se paga una recepción completa', () => {
    expect(pendingToPay(received)).toBe(99_000)
    expect(canPay(received)).toBe(true)
    expect(canPay({ ...received, status: 'partial' })).toBe(false)
    expect(canPay({ ...received, paidTotal: 119_000 })).toBe(false)
  })

  it('el pago no puede ser cero ni pasar de lo pendiente', () => {
    expect(payProblem(0, 99_000)).not.toBeNull()
    expect(payProblem(99_001, 99_000)).not.toBeNull()
    expect(payProblem(99_000, 99_000)).toBeNull()
  })
})
