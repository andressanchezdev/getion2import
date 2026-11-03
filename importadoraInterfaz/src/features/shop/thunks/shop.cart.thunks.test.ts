// shop.cart.thunks.test · pruebas del carrito contra el backend: leer, agregar (renglón nuevo o existente), cambiar cantidad, quitar, vaciar y errores
// conecta con: shop.cart.thunks, shop.cart.slice y shop.slice; los services, la sesión y las alertas están simulados (no hay red)
import { configureStore, type ThunkDispatch, type UnknownAction } from '@reduxjs/toolkit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthState } from '@/features/auth'
import { navigationReducer, setActiveWarehouse, type NavigationState } from '@/features/navigation'
import { toast } from '@/global/helpers/feedback/toast'
import { cartReducer } from '../slices/shop.cart.slice'
import { productsReducer } from '../slices/shop.products.slice'
import { shopReducer } from '../slices/shop.slice'
import { addToCartThunk, fetchCartThunk } from './shop.cart.thunks'
import { clearCartThunk, removeCartItemThunk, updateCartQuantityThunk } from './shop.cart.update.thunks'
import { addCartItem, clearCart, deleteCartItem, fetchActiveCart, updateCartItemQuantity } from '../services/shop.cart.service'
import { fetchProductsPage } from '../services/shop.products.service'
import { findStockId } from '../services/shop.stock.service'
import type { CartSnapshot, CartState } from '../types/shop.cart.api.types'
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

// ojo: el dispatch se tipa a mano para aceptar thunks que leen varios slices (el store de prueba solo tiene los que se prueban)
const makeStore = (sessionCtx: unknown = ctx, warehouseId: string | null = '4') => {
  const store = configureStore({
    reducer: {
      auth: (state = { ctx: sessionCtx } as unknown as AuthState) => state,
      shop: shopReducer,
      ui: navigationReducer,
      cart: cartReducer,
      products: productsReducer,
    },
  })
  if (warehouseId) store.dispatch(setActiveWarehouse({ id: warehouseId, name: 'Sur' }))
  const dispatch = store.dispatch as unknown as ThunkDispatch<TestState, undefined, UnknownAction>
  return { store, dispatch }
}

const product: Product = {
  id: '5',
  code: 'A-1',
  name: 'Pieza',
  brand: 'Bajaj',
  category: 'Motor',
  prices: { p0: 1000, p1: 900, p2: 800, p3: 700 },
  stockByWarehouse: { '4': 10 },
}

// renglón del carrito: el id del renglón es 11
const line = (quantity: number): CartItem => ({
  cartId: 11,
  productId: '5',
  product,
  quantity,
  selectedPrice: 900,
  priceLevel: null,
  subtotal: 900 * quantity,
})
const snapshot = (...items: CartItem[]): CartSnapshot => ({ cartId: 9, uuid: 'u-9', items })

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchActiveCart).mockResolvedValue(snapshot(line(2)))
  vi.mocked(findStockId).mockResolvedValue(21)
  vi.mocked(addCartItem).mockResolvedValue(undefined)
  vi.mocked(updateCartItemQuantity).mockResolvedValue(undefined)
  vi.mocked(deleteCartItem).mockResolvedValue(undefined)
  vi.mocked(clearCart).mockResolvedValue(undefined)
  vi.mocked(fetchProductsPage).mockResolvedValue({
    items: [],
    meta: { currentPage: 1, pageSize: 30, totalRecords: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false },
  })
})

describe('fetchCartThunk', () => {
  it('lee el carrito activo y guarda su id, su uuid y sus renglones', async () => {
    const { store, dispatch } = makeStore()
    await dispatch(fetchCartThunk())
    expect(store.getState().cart).toMatchObject({ cartId: 9, status: 'succeeded' })
    expect(store.getState().cart.items).toHaveLength(1)
    expect(store.getState().shop.cartUuid).toBe('u-9')
  })

  it('sin sesión no llama al backend', async () => {
    const { dispatch } = makeStore(null)
    await dispatch(fetchCartThunk())
    expect(fetchActiveCart).not.toHaveBeenCalled()
  })

  it('si falla deja el mensaje y el estado "failed"', async () => {
    vi.mocked(fetchActiveCart).mockRejectedValue({ userFriendlyMessage: 'Servidor caído' })
    const { store, dispatch } = makeStore()
    await dispatch(fetchCartThunk())
    expect(store.getState().cart).toMatchObject({ status: 'failed', error: 'Servidor caído' })
  })
})

describe('addToCartThunk', () => {
  it('renglón nuevo: busca la ubicación con stock, agrega con el precio del nivel y relee el carrito', async () => {
    const { store, dispatch } = makeStore()
    await dispatch(addToCartThunk({ product, quantity: 3, priceLevel: 'P1' }))
    expect(findStockId).toHaveBeenCalledWith(ctx, 4, 5, 3)
    expect(addCartItem).toHaveBeenCalledWith({ cartId: 9, stockId: 21, quantity: 3, price: 900 })
    expect(updateCartItemQuantity).not.toHaveBeenCalled()
    expect(store.getState().cart.items).toHaveLength(1)
    expect(store.getState().shop.cartLevels).toEqual({ '5': 'P1' })
    expect(store.getState().shop.cartUuid).toBe('u-9')
  })

  it('el carrito conserva el producto completo (marca e imagen) que la API no trae', async () => {
    const { store, dispatch } = makeStore()
    await dispatch(addToCartThunk({ product, quantity: 1, priceLevel: 'P0' }))
    expect(vi.mocked(fetchActiveCart).mock.calls.at(-1)?.[0]).toMatchObject({ '5': product })
    expect(store.getState().cart.products['5']).toEqual(product)
  })

  it('refresca el catálogo porque el backend descuenta stock', async () => {
    const { dispatch } = makeStore()
    await dispatch(addToCartThunk({ product, quantity: 1, priceLevel: 'P0' }))
    expect(fetchProductsPage).toHaveBeenCalled()
  })

  it('si el producto ya está en el carrito suma a su renglón en vez de crear otro', async () => {
    const { dispatch } = makeStore()
    await dispatch(addToCartThunk({ product, quantity: 2, priceLevel: 'P0' })) // el carrito queda con el renglón 11 (cantidad 2)
    vi.mocked(addCartItem).mockClear()
    await dispatch(addToCartThunk({ product, quantity: 3, priceLevel: 'P0' }))
    expect(updateCartItemQuantity).toHaveBeenCalledWith(9, 11, 5)
    expect(addCartItem).not.toHaveBeenCalled()
  })

  it('sin bodega elegida avisa y no llama al backend', async () => {
    const { dispatch } = makeStore(ctx, null)
    const result = await dispatch(addToCartThunk({ product, quantity: 1, priceLevel: 'P0' }))
    expect(addCartItem).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalled()
    expect(result.type).toContain('rejected')
  })

  it('si ninguna ubicación tiene stock suficiente avisa y no agrega', async () => {
    vi.mocked(findStockId).mockRejectedValue({ userFriendlyMessage: 'No hay stock suficiente de este producto en la bodega elegida.' })
    const { store, dispatch } = makeStore()
    await dispatch(addToCartThunk({ product, quantity: 99, priceLevel: 'P0' }))
    expect(addCartItem).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('No hay stock suficiente de este producto en la bodega elegida.')
    expect(store.getState().cart.mutating).toBe(false)
  })

  it('si el backend falla avisa con una alerta y deja libre el carrito para reintentar', async () => {
    vi.mocked(addCartItem).mockRejectedValue({ userFriendlyMessage: 'Stock insuficiente' })
    const { store, dispatch } = makeStore()
    await dispatch(addToCartThunk({ product, quantity: 3, priceLevel: 'P0' }))
    expect(toast.error).toHaveBeenCalledWith('Stock insuficiente')
    expect(store.getState().cart.mutating).toBe(false)
    expect(store.getState().cart.items).toEqual([])
  })

  it('no acepta otro cambio mientras uno está en curso', async () => {
    let release: () => void = () => undefined
    vi.mocked(addCartItem).mockReturnValue(new Promise<void>((resolve) => (release = resolve)))
    const { store, dispatch } = makeStore()
    const first = dispatch(addToCartThunk({ product, quantity: 1, priceLevel: 'P0' }))
    expect(store.getState().cart.mutating).toBe(true)
    await dispatch(addToCartThunk({ product, quantity: 1, priceLevel: 'P0' })) // ignorado
    release()
    await first
    expect(addCartItem).toHaveBeenCalledTimes(1)
    expect(store.getState().cart.mutating).toBe(false)
  })
})

describe('cambiar, quitar y vaciar', () => {
  const withCart = async () => {
    const made = makeStore()
    await made.dispatch(addToCartThunk({ product, quantity: 2, priceLevel: 'P1' }))
    vi.clearAllMocks()
    vi.mocked(fetchActiveCart).mockResolvedValue(snapshot(line(4)))
    vi.mocked(fetchProductsPage).mockResolvedValue({
      items: [],
      meta: { currentPage: 1, pageSize: 30, totalRecords: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false },
    })
    return made
  }

  it('cambia la cantidad con PUT y relee el carrito', async () => {
    const { store, dispatch } = await withCart()
    await dispatch(updateCartQuantityThunk({ cartId: 11, quantity: 4 }))
    expect(updateCartItemQuantity).toHaveBeenCalledWith(9, 11, 4)
    expect(store.getState().cart.items[0].quantity).toBe(4)
  })

  it('con cantidad 0 quita el renglón (DELETE) en vez de actualizar', async () => {
    const { dispatch } = await withCart()
    await dispatch(updateCartQuantityThunk({ cartId: 11, quantity: 0 }))
    expect(deleteCartItem).toHaveBeenCalledWith(9, 11)
    expect(updateCartItemQuantity).not.toHaveBeenCalled()
  })

  it('removeCartItemThunk quita el renglón y relee', async () => {
    const { store, dispatch } = await withCart()
    vi.mocked(fetchActiveCart).mockResolvedValue(snapshot())
    await dispatch(removeCartItemThunk(11))
    expect(deleteCartItem).toHaveBeenCalledWith(9, 11)
    expect(store.getState().cart.items).toEqual([])
  })

  it('clearCartThunk vacía el carrito por su id y olvida los niveles', async () => {
    const { store, dispatch } = await withCart()
    vi.mocked(fetchActiveCart).mockResolvedValue(snapshot())
    await dispatch(clearCartThunk())
    expect(clearCart).toHaveBeenCalledWith(9)
    expect(store.getState().cart.items).toEqual([])
    expect(store.getState().shop.cartLevels).toEqual({})
  })

  it('un error al quitar avisa y conserva el carrito', async () => {
    const { store, dispatch } = await withCart()
    vi.mocked(deleteCartItem).mockRejectedValue({ userFriendlyMessage: 'No encontrado' })
    await dispatch(removeCartItemThunk(11))
    expect(toast.error).toHaveBeenCalledWith('No encontrado')
    expect(store.getState().cart.items).toHaveLength(1)
  })
})
