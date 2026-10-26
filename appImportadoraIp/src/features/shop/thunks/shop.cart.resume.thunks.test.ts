// shop.cart.resume.thunks.test · pruebas de retomar un carrito guardado: se adopta solo si sus líneas se leen bien
// conecta con: shop.cart.resume.thunks, shop.slice y shop.cart.slice; los services, la sesión y las alertas están simulados (no hay red)
import { configureStore } from '@reduxjs/toolkit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { navigationReducer, setActiveWarehouse } from '@/features/navigation'
import { cartReducer } from '../slices/shop.cart.slice'
import { productsReducer } from '../slices/shop.products.slice'
import { shopReducer } from '../slices/shop.slice'
import { addToCartThunk } from './shop.cart.thunks'
import { resumeCartThunk } from './shop.cart.resume.thunks'
import { addCartItem, fetchCartItems } from '../services/shop.cart.service'
import { fetchProductsPage } from '../services/shop.products.service'
import type { CartItem, Product } from '../types/shop.types'

vi.mock('../services/shop.cart.service', () => ({
  fetchCartItems: vi.fn(),
  addCartItem: vi.fn(),
  updateCartItemQuantity: vi.fn(),
  deleteCartItem: vi.fn(),
  deleteCart: vi.fn(),
  reassignCart: vi.fn(),
}))
vi.mock('../services/shop.products.service', () => ({ fetchProductsPage: vi.fn(), searchProducts: vi.fn() }))
vi.mock('@/global/helpers/toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/features/auth', () => ({
  selectRequestContext: (state: { auth: { ctx: unknown } }) => state.auth.ctx,
}))

const ctx = { companyId: 3, userId: 7 }
const product: Product = { id: '5', code: 'A', name: 'A', brand: '', category: '', prices: { p0: 1000, p1: 900, p2: 800, p3: 700 }, stockByWarehouse: {} }
const lineOf = (cartId: number, subtotal: number): CartItem => ({ cartId, productId: '5', product, quantity: 1, selectedPrice: subtotal, priceLevel: null, subtotal })

const makeStore = () => {
  const store = configureStore({
    reducer: { auth: (state = { ctx }) => state, shop: shopReducer, ui: navigationReducer, cart: cartReducer, products: productsReducer },
  })
  store.dispatch(setActiveWarehouse({ id: '4', name: 'Sur' }))
  return store
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(addCartItem).mockResolvedValue(undefined)
  vi.mocked(fetchProductsPage).mockResolvedValue({ items: [], meta: { currentPage: 1, pageSize: 30, totalRecords: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false } })
})

describe('resumeCartThunk', () => {
  it('lee las líneas del carrito guardado y adopta su uuid, su cliente y sus líneas', async () => {
    vi.mocked(fetchCartItems).mockResolvedValueOnce([lineOf(1, 500)]) // carrito actual
    const store = makeStore()
    await store.dispatch(addToCartThunk({ product, quantity: 1, priceLevel: 'P1' }) as never)
    vi.mocked(fetchCartItems).mockResolvedValueOnce([lineOf(9, 7000)])
    const result = await store.dispatch(resumeCartThunk({ uuid: 'pend-1', customer: { id: 21, name: 'Ana' } }) as never)

    expect((result as { type: string }).type).toBe('shop/cart/resume/fulfilled')
    expect(fetchCartItems).toHaveBeenLastCalledWith(ctx, { uuid: 'pend-1', warehouseId: 4, customerId: 21 })
    expect(store.getState().shop.cartUuid).toBe('pend-1')
    expect(store.getState().shop.cartCustomer).toEqual({ id: 21, name: 'Ana' })
    expect(store.getState().cart.items.map((line) => line.cartId)).toEqual([9])
  })

  it('si la lectura falla el carrito actual no cambia (uuid y líneas siguen siendo del mismo carrito)', async () => {
    vi.mocked(fetchCartItems).mockResolvedValueOnce([lineOf(1, 500)])
    const store = makeStore()
    await store.dispatch(addToCartThunk({ product, quantity: 1, priceLevel: 'P1' }) as never)
    const uuidBefore = store.getState().shop.cartUuid
    vi.mocked(fetchCartItems).mockRejectedValueOnce(new Error('boom'))
    const result = await store.dispatch(resumeCartThunk({ uuid: 'pend-1', customer: null }) as never)

    expect((result as { type: string }).type).toBe('shop/cart/resume/rejected')
    expect(store.getState().shop.cartUuid).toBe(uuidBefore)
    expect(store.getState().cart.items.map((line) => line.cartId)).toEqual([1])
    expect(store.getState().cart.mutating).toBe(false)
  })
})
