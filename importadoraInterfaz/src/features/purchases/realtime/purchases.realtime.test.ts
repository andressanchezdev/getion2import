// purchases.realtime.test · las compras de otros usuarios entran a la lista y al detalle por evento
import { describe, expect, it } from 'vitest'
import { INITIAL_PURCHASES_STATE } from '../constants/purchases.constants'
import { purchaseCreatedFromEvent, purchasePaymentFromEvent, purchasesReducer, purchaseStatusFromEvent, supplierCatalogImportedFromEvent } from '../slices/purchases.slice'
import type { Purchase, PurchaseItem } from '../types/purchases.types'

const item: PurchaseItem = { id: 1, productId: 88, productCode: 'A1', productName: 'Filtro', supplierCode: '', quantity: 10, receivedQty: 0, unitCost: 100, ivaPercent: 19, subtotal: 1000 }
const purchase: Purchase = { id: 5, serial: 'OC-5', supplierId: 2, supplierName: 'Proveedor', warehouseId: 7, warehouseName: 'Principal', employeeName: 'Ana', status: 'ordered', supplierRef: '', expectedDate: '', subtotal: 1000, ivaTotal: 190, total: 1190, paidTotal: 0, notes: '', receivedAt: '', createdAt: '2026-11-12', items: [item] }
const loaded = { ...INITIAL_PURCHASES_STATE, status: 'succeeded' as const, warehouseId: 7 }
const withDetail = { ...loaded, items: [{ ...purchase, items: [] }], detail: { ...INITIAL_PURCHASES_STATE.detail, id: 5, data: purchase } }

describe('compras en tiempo real', () => {
  it('purchase.created entra una sola vez, y solo a la lista de su bodega ya cargada', () => {
    const once = purchasesReducer(loaded, purchaseCreatedFromEvent(purchase))
    expect(purchasesReducer(once, purchaseCreatedFromEvent(purchase)).items).toHaveLength(1)
    expect(once.items[0].items).toEqual([])
    expect(purchasesReducer({ ...loaded, warehouseId: 8 }, purchaseCreatedFromEvent(purchase)).items).toHaveLength(0)
    expect(purchasesReducer(INITIAL_PURCHASES_STATE, purchaseCreatedFromEvent(purchase)).items).toHaveLength(0)
  })
  it('purchase.status_changed cambia el estado y lo recibido del detalle abierto', () => {
    const state = purchasesReducer(withDetail, purchaseStatusFromEvent({ id: 5, to: 'received', lines: [{ productId: 88, received: 10 }], at: '2026-11-12T10:00:00Z' }))
    expect(state.items[0]).toMatchObject({ status: 'received', receivedAt: '2026-11-12T10:00:00Z' })
    expect(state.detail.data?.items[0].receivedQty).toBe(10)
  })
  it('purchase.payment_recorded actualiza lo pagado en la lista y el detalle', () => {
    const state = purchasesReducer(withDetail, purchasePaymentFromEvent({ purchaseId: 5, paid: 500 }))
    expect(state.items[0].paidTotal).toBe(500)
    expect(state.detail.data?.paidTotal).toBe(500)
  })
  it('supplier_catalog.imported sube el contador de ese proveedor', () => {
    expect(purchasesReducer(loaded, supplierCatalogImportedFromEvent(2)).catalogTicks[2]).toBe(1)
  })
})
