// shop.cart.customer.thunks.test · pruebas de elegir o quitar el cliente de la venta: reasignar el carrito, nivel de precio y casos sin carrito
// conecta con: shop.cart.customer.thunks, shop.slice y shop.cart.slice; los services, la sesión y las alertas están simulados (no hay red)
import { configureStore, type ThunkDispatch, type UnknownAction } from '@reduxjs/toolkit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthState } from '@/features/auth'
import { navigationReducer, setActiveWarehouse, type NavigationState } from '@/features/navigation'
import { toast } from '@/global/helpers/toast'
import { cartReducer } from '../slices/shop.cart.slice'
import { productsReducer } from '../slices/shop.products.slice'
import { shopReducer } from '../slices/shop.slice'
import { addToCartThunk } from './shop.cart.thunks'
import { setCartCustomerThunk } from './shop.cart.customer.thunks'
import { addCartItem, fetchCartItems, reassignCart } from '../services/shop.cart.service'
import { fetchProductsPage } from '../services/shop.products.service'
import type { CartState } from '../types/shop.cart.api.types'
import type { ProductsState } from '../types/shop.api.types'
import type { CartItem, Product, ShopState } from '../types/shop.types'

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
type TestState = { auth: AuthState; shop: ShopState; ui: NavigationState; cart: CartState; products: ProductsState }

const makeStore = () => {
  const store = configureStore({
    reducer: {
      auth: (state = { ctx } as unknown as AuthState) => state,
      shop: shopReducer,
      ui: navigationReducer,
      cart: cartReducer,
      products: productsReducer,
    },
  })
  store.dispatch(setActiveWarehouse({ id: '4', name: 'Sur' }))
  const dispatch = store.dispatch as unknown as ThunkDispatch<TestState, undefined, UnknownAction>
  return { store, dispatch }
}

const product: Product = {
  id: '5',
  code: 'A',
  name: 'A',
  brand: '',
  category: '',
  prices: { p0: 1000, p1: 900, p2: 800, p3: 700 },
  stockByWarehouse: {},
}
const line: CartItem = { cartId: 11, productId: '5', product, quantity: 1, selectedPrice: 900, priceLevel: null, subtotal: 900 }
const customer = { id: 21, name: 'Ana Pérez', priceType: 'P2' }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchCartItems).mockResolvedValue([line])
  vi.mocked(addCartItem).mockResolvedValue(undefined)
  vi.mocked(reassignCart).mockResolvedValue(undefined)
  vi.mocked(fetchProductsPage).mockResolvedValue({
    items: [],
    meta: { currentPage: 1, pageSize: 30, totalRecords: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false },
  })
})

describe('setCartCustomerThunk', () => {
  it('sin carrito solo recuerda al cliente (no llama al backend) y toma su nivel de precio', async () => {
    const { store, dispatch } = makeStore()
    await dispatch(setCartCustomerThunk(customer))
    expect(reassignCart).not.toHaveBeenCalled()
    expect(fetchCartItems).not.toHaveBeenCalled()
    expect(store.getState().shop.cartCustomer).toEqual(customer)
    expect(store.getState().shop.filters.priceLevel).toBe('P2')
  })

  it('con carrito lo reasigna del usuario de la sesión al cliente y relee con el cliente', async () => {
    const { store, dispatch } = makeStore()
    await dispatch(addToCartThunk({ product, quantity: 1, priceLevel: 'P1' }))
    const uuid = store.getState().shop.cartUuid
    vi.mocked(fetchCartItems).mockClear()
    await dispatch(setCartCustomerThunk(customer))
    expect(reassignCart).toHaveBeenCalledWith(7, 21, uuid)
    expect(fetchCartItems).toHaveBeenCalledWith(ctx, { uuid, warehouseId: 4, customerId: 21 })
    expect(store.getState().cart.items).toHaveLength(1)
  })

  it('al agregar productos con cliente elegido, la línea va a nombre del cliente', async () => {
    const { dispatch } = makeStore()
    await dispatch(setCartCustomerThunk(customer))
    await dispatch(addToCartThunk({ product, quantity: 2, priceLevel: 'P2' }))
    expect(addCartItem).toHaveBeenCalledWith(ctx, expect.objectContaining({ customerId: 21, productId: 5, quantity: 2, price: 800 }))
  })

  it('cambiar de un cliente a otro reasigna del primero al segundo', async () => {
    const { store, dispatch } = makeStore()
    await dispatch(addToCartThunk({ product, quantity: 1, priceLevel: 'P0' }))
    await dispatch(setCartCustomerThunk(customer))
    await dispatch(setCartCustomerThunk({ id: 30, name: 'Luis' }))
    expect(reassignCart).toHaveBeenLastCalledWith(21, 30, store.getState().shop.cartUuid)
  })

  it('quitar al cliente devuelve el carrito al usuario de la sesión', async () => {
    const { store, dispatch } = makeStore()
    await dispatch(addToCartThunk({ product, quantity: 1, priceLevel: 'P0' }))
    await dispatch(setCartCustomerThunk(customer))
    await dispatch(setCartCustomerThunk(null))
    expect(reassignCart).toHaveBeenLastCalledWith(21, 7, store.getState().shop.cartUuid)
    expect(store.getState().shop.cartCustomer).toBeNull()
  })

  it('si el backend falla avisa y conserva al cliente anterior', async () => {
    const { store, dispatch } = makeStore()
    await dispatch(addToCartThunk({ product, quantity: 1, priceLevel: 'P0' }))
    vi.mocked(reassignCart).mockRejectedValue({ userFriendlyMessage: 'No se pudo reasignar' })
    await dispatch(setCartCustomerThunk(customer))
    expect(toast.error).toHaveBeenCalledWith('No se pudo reasignar')
    expect(store.getState().shop.cartCustomer).toBeNull()
    expect(store.getState().cart.mutating).toBe(false)
  })

  it('cerrar sesión olvida al cliente de la venta', async () => {
    const { store, dispatch } = makeStore()
    await dispatch(setCartCustomerThunk(customer))
    store.dispatch({ type: 'auth/logout/fulfilled' })
    expect(store.getState().shop.cartCustomer).toBeNull()
  })
})
