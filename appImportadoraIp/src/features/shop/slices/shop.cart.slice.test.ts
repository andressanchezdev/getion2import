// shop.cart.slice.test · pruebas del estado del carrito: lectura, bandera de cambio en curso y reinicio al cerrar sesión
// conecta con: shop.cart.slice; se simulan las acciones de los thunks (no hay red)
import { describe, expect, it } from 'vitest'
import { cartReducer, INITIAL_CART_STATE, resetCart } from './shop.cart.slice'
import { addToCartThunk, fetchCartThunk } from '../thunks/shop.cart.thunks'
import { clearCartThunk } from '../thunks/shop.cart.update.thunks'
import type { CartItem, Product } from '../types/shop.types'

const product: Product = {
  id: '5',
  code: 'A',
  name: 'A',
  brand: '',
  category: '',
  prices: { p0: 1, p1: 1, p2: 1, p3: 1 },
  stockByWarehouse: {},
}
const item: CartItem = { cartId: 1, productId: '5', product, quantity: 2, selectedPrice: 10, priceLevel: null, subtotal: 20 }
const addArg = { product, quantity: 2, priceLevel: 'P0' as const }

describe('shop.cart.slice', () => {
  it('leer: loading, luego las líneas y "succeeded"', () => {
    let state = cartReducer(INITIAL_CART_STATE, fetchCartThunk.pending('r1'))
    expect(state.status).toBe('loading')
    state = cartReducer(state, fetchCartThunk.fulfilled([item], 'r1'))
    expect(state).toMatchObject({ status: 'succeeded', items: [item] })
  })

  it('leer con error guarda el mensaje', () => {
    const state = cartReducer(INITIAL_CART_STATE, fetchCartThunk.rejected(null, 'r1', undefined, 'Sin conexión'))
    expect(state).toMatchObject({ status: 'failed', error: 'Sin conexión' })
  })

  it('un cambio en curso levanta la bandera y al terminar (bien o mal) la baja', () => {
    let state = cartReducer(INITIAL_CART_STATE, addToCartThunk.pending('r1', addArg))
    expect(state.mutating).toBe(true)
    state = cartReducer(state, addToCartThunk.fulfilled({ items: [item], uuid: 'u' }, 'r1', addArg))
    expect(state).toMatchObject({ mutating: false, items: [item] })

    state = cartReducer(state, clearCartThunk.pending('r2'))
    expect(state.mutating).toBe(true)
    state = cartReducer(state, clearCartThunk.rejected(null, 'r2', undefined, 'falló'))
    expect(state.mutating).toBe(false)
    expect(state.items).toEqual([item]) // si vaciar falla, el carrito se conserva
  })

  it('vaciar con éxito deja el carrito sin líneas', () => {
    const full = { ...INITIAL_CART_STATE, items: [item] }
    expect(cartReducer(full, clearCartThunk.fulfilled([], 'r1')).items).toEqual([])
  })

  it('resetCart vuelve al estado inicial (al cerrar sesión)', () => {
    const full = { ...INITIAL_CART_STATE, items: [item], status: 'succeeded' as const, mutating: true }
    expect(cartReducer(full, resetCart())).toEqual(INITIAL_CART_STATE)
  })
})
