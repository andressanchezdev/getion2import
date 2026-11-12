// shop.realtime.test · evento → estado esperado en tienda: stock del catálogo, topes del carrito, producto inactivo y cliente inactivo
// conecta con: shop.products.slice, shop.cart.slice y shop.slice; no hay red ni store de la app
import { describe, expect, it } from 'vitest'
import { cartProductStatusFromEvent, cartReducer, cartStockChangedFromEvent, cartUpdatedFromEvent, INITIAL_CART_STATE } from '../slices/shop.cart.slice'
import { INITIAL_PRODUCTS_STATE, productStatusFromEvent, productsReducer, stockTotalsFromEvent } from '../slices/shop.products.slice'
import { cartCustomerStatusFromEvent, shopReducer } from '../slices/shop.slice'
import { INITIAL_SHOP_STATE } from '../constants/shop.constants'
import type { CartItem, Product } from '../types/shop.types'

const product: Product = {
  id: '88',
  code: 'REP-88',
  name: 'Pastillas',
  brand: 'Bajaj',
  category: 'Frenos',
  prices: { p0: 1, p1: 1, p2: 1, p3: 1 },
  stockByWarehouse: { '7': 20 },
  updatedAt: '2026-11-12T10:00:00.000000Z',
}
const line: CartItem = { cartId: 5, stockId: 501, productId: '88', product, quantity: 3, selectedPrice: 1000, priceLevel: null, subtotal: 3000 }

describe('shop realtime', () => {
  it('stock.changed actualiza lo vendible por producto y bodega en el catálogo', () => {
    const state = productsReducer({ ...INITIAL_PRODUCTS_STATE, items: [product] }, stockTotalsFromEvent([{ productId: 88, warehouseId: 7, sellable: 15 }]))
    expect(state.items[0].stockByWarehouse['7']).toBe(15)
  })

  it('stock.changed pone el tope vendible en la línea del carrito', () => {
    const state = cartReducer({ ...INITIAL_CART_STATE, items: [line] }, cartStockChangedFromEvent([{ stockId: 501, productId: 88, sellable: 2 }]))
    expect(state.items[0].maxAvailable).toBe(2)
  })

  it('producto inactivo: sale del catálogo y su línea del carrito queda no disponible', () => {
    const products = productsReducer({ ...INITIAL_PRODUCTS_STATE, items: [product] }, productStatusFromEvent({ id: 88, version: '2026-11-12T10:05:00.000000Z', to: 'inactive' }))
    expect(products.items).toEqual([])
    const cart = cartReducer({ ...INITIAL_CART_STATE, items: [line] }, cartProductStatusFromEvent({ productId: '88', status: 'inactive' }))
    expect(cart.items[0].unavailable).toBe(true)
  })

  it('un evento de producto más viejo no lo quita del catálogo', () => {
    const state = productsReducer({ ...INITIAL_PRODUCTS_STATE, items: [product] }, productStatusFromEvent({ id: 88, version: '2026-11-12T09:00:00.000000Z', to: 'inactive' }))
    expect(state.items).toHaveLength(1)
  })

  it('cart.updated más nuevo reemplaza las líneas; uno viejo se descarta', () => {
    const dto = { id: 9, uuid: 'u', items: [{ id: 5, cartId: 9, productId: 88, productCode: 'REP-88', productName: 'Pastillas', stockId: 501, quantity: 4, unitPrice: 1000, lineTotal: 4000 }] }
    const first = cartReducer(INITIAL_CART_STATE, cartUpdatedFromEvent({ cart: dto, version: '2026-11-12T10:00:00.000000Z' }))
    expect(first.items[0].quantity).toBe(4)
    const stale = cartReducer(first, cartUpdatedFromEvent({ cart: { ...dto, items: [] }, version: '2026-11-12T09:00:00.000000Z' }))
    expect(stale.items).toHaveLength(1)
  })

  it('cliente inactivo marca al cliente del carrito como no disponible', () => {
    const state = shopReducer({ ...INITIAL_SHOP_STATE, cartCustomer: { id: 4, name: 'Ana' } }, cartCustomerStatusFromEvent({ customerId: 4, status: 'inactive' }))
    expect(state.cartCustomer?.unavailable).toBe(true)
  })
})

