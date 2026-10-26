// shop.checkout.thunks.test · pruebas de finalizar el pedido: venta registrada, carrito olvidado, errores y casos sin carrito o bodega
// conecta con: shop.checkout.thunks, shop.slice y shop.cart.slice; los services, la sesión y las alertas están simulados (no hay red)
import { configureStore, type ThunkDispatch, type UnknownAction } from '@reduxjs/toolkit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthState } from '@/features/auth'
import { navigationReducer, setActiveWarehouse, type NavigationState } from '@/features/navigation'
import { toast } from '@/global/helpers/toast'
import { cartReducer } from '../slices/shop.cart.slice'
import { productsReducer } from '../slices/shop.products.slice'
import { shopReducer } from '../slices/shop.slice'
import { addToCartThunk } from './shop.cart.thunks'
import { checkoutThunk } from './shop.checkout.thunks'
import { setCartCustomerThunk } from './shop.cart.customer.thunks'
import { addCartItem, fetchCartItems } from '../services/shop.cart.service'
import { fetchProductsPage } from '../services/shop.products.service'
import { registerSale } from '../services/shop.sales.service'
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
vi.mock('../services/shop.sales.service', () => ({ registerSale: vi.fn() }))
vi.mock('@/global/helpers/toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/features/auth', () => ({
  selectRequestContext: (state: { auth: { ctx: unknown } }) => state.auth.ctx,
}))

const ctx = { companyId: 3, userId: 7 }
type TestState = { auth: AuthState; shop: ShopState; ui: NavigationState; cart: CartState; products: ProductsState }

const makeStore = (withWarehouse = true) => {
  const store = configureStore({
    reducer: {
      auth: (state = { ctx } as unknown as AuthState) => state,
      shop: shopReducer,
      ui: navigationReducer,
      cart: cartReducer,
      products: productsReducer,
    },
  })
  if (withWarehouse) store.dispatch(setActiveWarehouse({ id: '4', name: 'Sur' }))
  const dispatch = store.dispatch as unknown as ThunkDispatch<TestState, undefined, UnknownAction>
  return { store, dispatch }
}

const product: Product = { id: '5', code: 'A', name: 'A', brand: '', category: '', prices: { p0: 1000, p1: 900, p2: 800, p3: 700 }, stockByWarehouse: {} }
const line: CartItem = { cartId: 11, productId: '5', product, quantity: 2, selectedPrice: 900, priceLevel: null, subtotal: 1800 }

// deja un carrito con una línea y su uuid, como después de agregar un producto (sin bodega el agregado se rechaza y el carrito queda vacío)
const withCart = async () => {
  const made = makeStore(true)
  await made.dispatch(addToCartThunk({ product, quantity: 2, priceLevel: 'P1' }))
  return made
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchCartItems).mockResolvedValue([line])
  vi.mocked(addCartItem).mockResolvedValue(undefined)
  vi.mocked(fetchProductsPage).mockResolvedValue({
    items: [],
    meta: { currentPage: 1, pageSize: 30, totalRecords: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false },
  })
})

describe('checkoutThunk', () => {
  it('registra la venta con el uuid, la bodega y el total del carrito, y olvida el carrito', async () => {
    vi.mocked(registerSale).mockResolvedValue({ saleId: 9, serialCode: 321 })
    const { store, dispatch } = await withCart()
    const uuid = store.getState().shop.cartUuid
    const result = await dispatch(checkoutThunk('cash'))

    expect(result.type).toBe('shop/checkout/fulfilled')
    expect(registerSale).toHaveBeenCalledWith(ctx, { uuid, customerId: undefined, warehouseId: 4, paymentMethod: 'cash', totalAmount: 1800 })
    expect(store.getState().shop.cartUuid).toBe('')
    expect(store.getState().cart.items).toEqual([])
    expect(toast.success).toHaveBeenCalledWith('Pedido 321 registrado.')
  })

  it('si el backend rechaza la venta el carrito se conserva y se avisa', async () => {
    vi.mocked(registerSale).mockRejectedValue(new Error('boom'))
    const { store, dispatch } = await withCart()
    const uuid = store.getState().shop.cartUuid
    const result = await dispatch(checkoutThunk('transfer'))

    expect(result.type).toBe('shop/checkout/rejected')
    expect(store.getState().shop.cartUuid).toBe(uuid)
    expect(store.getState().cart.items).toHaveLength(1)
    expect(store.getState().cart.mutating).toBe(false)
    expect(toast.error).toHaveBeenCalled()
  })

  it('con el carrito vacío no llama al backend', async () => {
    const { dispatch } = makeStore()
    const result = await dispatch(checkoutThunk('cash'))
    expect(result.type).toBe('shop/checkout/rejected')
    expect(registerSale).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('El carrito está vacío.')
  })

  it('una venta a crédito sin cliente no llama al backend y avisa', async () => {
    const { store, dispatch } = await withCart()
    const result = await dispatch(checkoutThunk('credit'))
    expect(result.type).toBe('shop/checkout/rejected')
    expect(registerSale).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Elige el cliente de la venta para venderla a crédito.')
    expect(store.getState().cart.items).toHaveLength(1)
  })

  it('una venta a crédito con cliente se registra a nombre del cliente', async () => {
    vi.mocked(registerSale).mockResolvedValue({ serialCode: 5 })
    const { store, dispatch } = await withCart()
    await dispatch(setCartCustomerThunk({ id: 21, name: 'Ana', priceType: 'P1' }))
    await dispatch(checkoutThunk('credit'))
    expect(registerSale).toHaveBeenCalledWith(ctx, expect.objectContaining({ customerId: 21, paymentMethod: 'credit' }))
    expect(store.getState().shop.cartCustomer).toBeNull()
  })

  it('sin bodega elegida no llama al backend', async () => {
    const { dispatch } = makeStore(false)
    const result = await dispatch(checkoutThunk('cash'))
    expect(result.type).toBe('shop/checkout/rejected')
    expect(registerSale).not.toHaveBeenCalled()
  })

  it('solo se acepta un cambio a la vez', async () => {
    vi.mocked(registerSale).mockResolvedValue({})
    const { dispatch } = await withCart()
    const first = dispatch(checkoutThunk('cash'))
    const second = await dispatch(checkoutThunk('cash'))
    await first
    expect(second.type).toBe('shop/checkout/rejected')
    expect(registerSale).toHaveBeenCalledTimes(1)
  })
})
