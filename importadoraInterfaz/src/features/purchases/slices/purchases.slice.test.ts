// purchases.slice.test · el estado de compras: carga de la lista, descarte de respuestas viejas y cambios que actualizan la lista y el detalle
// conecta con: purchases.slice y purchases.thunks; se corre con npm test
import { describe, expect, it } from 'vitest'
import { INITIAL_PURCHASES_STATE } from '../constants/purchases.constants'
import { createPurchaseThunk, loadPurchaseDetailThunk, loadPurchasesThunk, receivePurchaseThunk } from '../thunks/purchases.thunks'
import { openPurchase, purchasesReducer } from './purchases.slice'
import type { Purchase } from '../types/purchases.types'

const purchase = (over: Partial<Purchase> = {}): Purchase => ({
  id: 1, serial: 'OC-1', supplierId: 1, supplierName: 'Bajaj', warehouseId: 1, warehouseName: 'Principal', employeeName: 'Ana', status: 'ordered', supplierRef: '', expectedDate: '', subtotal: 100, ivaTotal: 19, total: 119, paidTotal: 0, notes: '', receivedAt: '', createdAt: '2026-11-01',
  items: [{ id: 5, productId: 9, productCode: 'A', productName: 'Pastillas', supplierCode: '', quantity: 10, receivedQty: 0, unitCost: 10, ivaPercent: 19, subtotal: 100 }],
  ...over,
})

describe('purchases.slice', () => {
  it('carga la lista de una bodega y descarta una respuesta vieja', () => {
    let state = purchasesReducer(INITIAL_PURCHASES_STATE, loadPurchasesThunk.pending('a', 1))
    state = purchasesReducer(state, loadPurchasesThunk.pending('b', 1))
    state = purchasesReducer(state, loadPurchasesThunk.fulfilled([purchase()], 'a', 1))
    expect(state.items).toEqual([])
    state = purchasesReducer(state, loadPurchasesThunk.fulfilled([purchase()], 'b', 1))
    expect(state).toMatchObject({ status: 'succeeded', warehouseId: 1 })
    expect(state.items).toHaveLength(1)
  })

  it('al cambiar de bodega se vacía la lista anterior', () => {
    let state = purchasesReducer(INITIAL_PURCHASES_STATE, loadPurchasesThunk.pending('a', 1))
    state = purchasesReducer(state, loadPurchasesThunk.fulfilled([purchase()], 'a', 1))
    state = purchasesReducer(state, loadPurchasesThunk.pending('b', 2))
    expect(state.items).toEqual([])
  })

  it('crear agrega la orden arriba de la lista, sin renglones', () => {
    let state = purchasesReducer(INITIAL_PURCHASES_STATE, loadPurchasesThunk.pending('a', 1))
    state = purchasesReducer(state, loadPurchasesThunk.fulfilled([purchase()], 'a', 1))
    state = purchasesReducer(state, createPurchaseThunk.fulfilled(purchase({ id: 2, serial: 'OC-2' }), 'c', { supplierId: 1, warehouseId: 1, items: [] }))
    expect(state.items.map((item) => item.id)).toEqual([2, 1])
    expect(state.items[0].items).toEqual([])
    expect(state.saving).toBe(false)
  })

  it('recibir actualiza la lista y también el detalle abierto', () => {
    let state = purchasesReducer(INITIAL_PURCHASES_STATE, loadPurchasesThunk.pending('a', 1))
    state = purchasesReducer(state, loadPurchasesThunk.fulfilled([purchase()], 'a', 1))
    state = purchasesReducer(state, openPurchase(1))
    state = purchasesReducer(state, loadPurchaseDetailThunk.pending('d', 1))
    state = purchasesReducer(state, loadPurchaseDetailThunk.fulfilled(purchase(), 'd', 1))
    const received = purchase({ status: 'received', items: [{ ...purchase().items[0], receivedQty: 10 }] })
    state = purchasesReducer(state, receivePurchaseThunk.fulfilled(received, 'e', { id: 1, lines: [] }))
    expect(state.items[0].status).toBe('received')
    expect(state.detail.data?.items[0].receivedQty).toBe(10)
  })

  it('una respuesta vieja del detalle no pisa la orden que se abrió después', () => {
    let state = purchasesReducer(INITIAL_PURCHASES_STATE, loadPurchaseDetailThunk.pending('x', 1))
    state = purchasesReducer(state, loadPurchaseDetailThunk.pending('y', 2))
    state = purchasesReducer(state, loadPurchaseDetailThunk.fulfilled(purchase(), 'x', 1))
    expect(state.detail.data).toBeNull()
  })
})
