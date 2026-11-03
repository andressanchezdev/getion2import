// shop.cart.customer.thunks.test · pruebas de elegir o quitar el cliente de la venta: se guarda en la app, toma su nivel de precio y no toca el carrito del servidor
// conecta con: shop.cart.customer.thunks, shop.slice y shop.cart.slice; la sesión y los services están simulados (no hay red)
import { configureStore, type ThunkDispatch, type UnknownAction } from '@reduxjs/toolkit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthState } from '@/features/auth'
import { navigationReducer, setActiveWarehouse, type NavigationState } from '@/features/navigation'
import { cartReducer } from '../slices/shop.cart.slice'
import { productsReducer } from '../slices/shop.products.slice'
import { shopReducer } from '../slices/shop.slice'
import { addToCartThunk } from './shop.cart.thunks'
import { setCartCustomerThunk } from './shop.cart.customer.thunks'
import { addCartItem, fetchActiveCart } from '../services/shop.cart.service'
import { fetchProductsPage } from '../services/shop.products.service'
import { findStockId } from '../services/shop.stock.service'
import type { CartState } from '../types/shop.cart.api.types'
import type { ProductsState } from '../types/shop.api.types'
import type { CartItem, Product, ShopState } from '../types/shop.types'

vi.mock('../services/shop.cart.service', () => ({
  fetchActiveCart: vi.fn(),
  addCartItem: vi.fn(),
  updateCartItemQuantity: vi.fn(),
  deleteCartItem: vi.fn(),
  clearCart: vi.fn(),
}))
vi.mock('../services/shop.stock.service', () => ({ findStockId: vi.fn(), fetchWarehouseStock: vi.fn() }))
vi.mock('../services/shop.products.service', () => ({ fetchProductsPage: vi.fn(), searchProducts: vi.fn() }))
vi.mock('@/global/helpers/feedback/toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/features/auth', () => ({
  selectRequestContext: (state: { auth: { ctx: unknown } }) => state.auth.ctx,
}))

const ctx = { companyId: 3, userId: 7 }
type TestState = { auth: AuthState; shop: ShopState; ui: NavigationState; cart: CartState; products: ProductsState }

const makeStore = (sessionCtx: unknown = ctx) => {
  const store = configureStore({
    reducer: {
      auth: (state = { ctx: sessionCtx } as unknown as AuthState) => state,
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
  vi.mocked(fetchActiveCart).mockResolvedValue({ cartId: 9, uuid: 'u-9', items: [line] })
  vi.mocked(findStockId).mockResolvedValue(21)
  vi.mocked(addCartItem).mockResolvedValue(undefined)
  vi.mocked(fetchProductsPage).mockResolvedValue({
    items: [],
    meta: { currentPage: 1, pageSize: 30, totalRecords: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false },
  })
})

describe('setCartCustomerThunk', () => {
  it('guarda al cliente y toma su nivel de precio sin llamar al servidor', async () => {
    const { store, dispatch } = makeStore()
    await dispatch(setCartCustomerThunk(customer))
    expect(fetchActiveCart).not.toHaveBeenCalled()
    expect(store.getState().shop.cartCustomer).toEqual(customer)
    expect(store.getState().shop.filters.priceLevel).toBe('P2')
  })

  it('con carrito, los renglones quedan como estaban', async () => {
    const { store, dispatch } = makeStore()
    await dispatch(addToCartThunk({ product, quantity: 1, priceLevel: 'P1' }))
    vi.mocked(fetchActiveCart).mockClear()
    await dispatch(setCartCustomerThunk(customer))
    expect(fetchActiveCart).not.toHaveBeenCalled()
    expect(store.getState().cart.items).toHaveLength(1)
  })

  it('cambiar de un cliente a otro reemplaza al primero', async () => {
    const { store, dispatch } = makeStore()
    await dispatch(setCartCustomerThunk(customer))
    await dispatch(setCartCustomerThunk({ id: 30, name: 'Luis' }))
    expect(store.getState().shop.cartCustomer).toEqual({ id: 30, name: 'Luis' })
  })

  it('quitar al cliente deja la venta sin cliente', async () => {
    const { store, dispatch } = makeStore()
    await dispatch(setCartCustomerThunk(customer))
    await dispatch(setCartCustomerThunk(null))
    expect(store.getState().shop.cartCustomer).toBeNull()
  })

  it('sin sesión no cambia nada', async () => {
    const { store, dispatch } = makeStore(null)
    await dispatch(setCartCustomerThunk(customer))
    expect(store.getState().shop.cartCustomer).toBeNull()
  })

  it('cerrar sesión olvida al cliente de la venta', async () => {
    const { store, dispatch } = makeStore()
    await dispatch(setCartCustomerThunk(customer))
    store.dispatch({ type: 'auth/logout/fulfilled' })
    expect(store.getState().shop.cartCustomer).toBeNull()
  })
})
