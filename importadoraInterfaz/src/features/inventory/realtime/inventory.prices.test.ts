// inventory.prices.test · product.prices_changed cambia las tarifas del producto en la tabla (la API numera p1 a p4; la app, p0 a p3)
import { describe, expect, it } from 'vitest'
import { INITIAL_INVENTORY_STATE } from '../constants/inventory.constants'
import { inventorySlice, productPricesFromEvent } from '../slices/inventory.slice'

const reducer = inventorySlice.reducer
type Row = (typeof INITIAL_INVENTORY_STATE.products.items)[number]
const product = { id: '88', prices: { p0: 100, p1: 90, p2: 80, p3: 70 } } as unknown as Row
const loaded = { ...INITIAL_INVENTORY_STATE, products: { ...INITIAL_INVENTORY_STATE.products, items: [product] } }

describe('product.prices_changed en inventario', () => {
  it('cambia las cuatro tarifas del producto', () => {
    const state = reducer(loaded, productPricesFromEvent({ productId: 88, prices: { p1: 120, p2: 110, p3: 100, p4: 95 } }))
    expect(state.products.items[0].prices).toEqual({ p0: 120, p1: 110, p2: 100, p3: 95 })
  })
  it('un producto que no está en la tabla no cambia nada', () => {
    const state = reducer(loaded, productPricesFromEvent({ productId: 99, prices: { p1: 1, p2: 1, p3: 1, p4: 1 } }))
    expect(state.products.items[0].prices).toEqual(product.prices)
  })
})
