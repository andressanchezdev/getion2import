// shop.products.thunks.test · pruebas de la carga de productos: modo lista con filtros y página, modo búsqueda, errores y sin sesión
// conecta con: shop.products.thunks, shop.slice y shop.products.slice; el service y la sesión están simulados (no hay red)
import { configureStore, type ThunkDispatch, type UnknownAction } from '@reduxjs/toolkit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthState } from '@/features/auth'
import { navigationReducer, setActiveWarehouse, type NavigationState } from '@/features/navigation'
import { productsReducer, setProductsPage } from '../slices/shop.products.slice'
import { setOnlyInStock, setSearchQuery, setSelectedBrand, setSelectedCategory, shopReducer } from '../slices/shop.slice'
import { loadProductsThunk } from './shop.products.thunks'
import { fetchProductsPage, searchProducts } from '../services/shop.products.service'
import type { ProductsState } from '../types/shop.api.types'
import type { ShopState } from '../types/shop.types'

vi.mock('../services/shop.products.service', () => ({
  fetchProductsPage: vi.fn(),
  searchProducts: vi.fn(),
}))

// la sesión se simula: el thunk solo necesita selectRequestContext
vi.mock('@/features/auth', () => ({
  selectRequestContext: (state: { auth: { ctx: unknown } }) => state.auth.ctx,
}))

const ctx = { companyId: 3, userId: 7 }
const meta = { currentPage: 1, pageSize: 30, totalRecords: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false }

type TestState = { auth: AuthState; shop: ShopState; ui: NavigationState; products: ProductsState }

// ojo: el dispatch se tipa a mano para aceptar thunks que leen varios slices (el store de prueba solo tiene los que se prueban)
const makeStore = (sessionCtx: unknown = ctx) => {
  const store = configureStore({
    reducer: {
      auth: (state = { ctx: sessionCtx } as unknown as AuthState) => state,
      shop: shopReducer,
      ui: navigationReducer,
      products: productsReducer,
    },
  })
  const dispatch = store.dispatch as unknown as ThunkDispatch<TestState, undefined, UnknownAction>
  return { store, dispatch }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchProductsPage).mockResolvedValue({ items: [], meta })
  vi.mocked(searchProducts).mockResolvedValue([])
})

describe('loadProductsThunk · modo lista', () => {
  it('pide la página 1 con 30 productos y la bodega activa', async () => {
    const { store, dispatch } = makeStore()
    store.dispatch(setActiveWarehouse({ id: '4', name: 'Sur' }))
    await dispatch(loadProductsThunk())
    expect(fetchProductsPage).toHaveBeenCalledWith(ctx, {
      page: 1,
      pageSize: 30,
      warehouseId: 4,
      brandId: null,
      categoryId: null,
      onlyInStock: false,
    })
    expect(searchProducts).not.toHaveBeenCalled()
  })

  it('manda los filtros elegidos (marca, categoría y con stock) y la página actual', async () => {
    const { store, dispatch } = makeStore()
    store.dispatch(setSelectedBrand(5))
    store.dispatch(setSelectedCategory(6))
    store.dispatch(setOnlyInStock(true))
    store.dispatch(setProductsPage(3))
    await dispatch(loadProductsThunk())
    expect(fetchProductsPage).toHaveBeenCalledWith(ctx, expect.objectContaining({ page: 3, brandId: 5, categoryId: 6, onlyInStock: true }))
  })

  it('sin bodega elegida todavía no manda warehouseId', async () => {
    const { dispatch } = makeStore()
    await dispatch(loadProductsThunk())
    expect(fetchProductsPage).toHaveBeenCalledWith(ctx, expect.objectContaining({ warehouseId: undefined }))
  })

  it('guarda productos, meta y modo "list"', async () => {
    vi.mocked(fetchProductsPage).mockResolvedValue({
      items: [{ id: '1', code: 'A', name: 'A', brand: '', category: '', prices: { p0: 1, p1: 1, p2: 1, p3: 1 }, stockByWarehouse: {} }],
      meta,
    })
    const { store, dispatch } = makeStore()
    await dispatch(loadProductsThunk())
    expect(store.getState().products).toMatchObject({ status: 'succeeded', mode: 'list', meta })
    expect(store.getState().products.items).toHaveLength(1)
  })
})

describe('loadProductsThunk · modo búsqueda', () => {
  it('con texto usa la búsqueda (sin meta) y no el listado', async () => {
    const { store, dispatch } = makeStore()
    store.dispatch(setSearchQuery('  freno  '))
    await dispatch(loadProductsThunk())
    expect(searchProducts).toHaveBeenCalledWith(ctx, 'freno', 50, undefined)
    expect(fetchProductsPage).not.toHaveBeenCalled()
    expect(store.getState().products).toMatchObject({ mode: 'search', meta: null })
  })

  it('un texto de solo espacios cuenta como sin texto', async () => {
    const { store, dispatch } = makeStore()
    store.dispatch(setSearchQuery('   '))
    await dispatch(loadProductsThunk())
    expect(fetchProductsPage).toHaveBeenCalled()
  })
})

describe('loadProductsThunk · errores', () => {
  it('si el backend falla deja el mensaje y el estado "failed"', async () => {
    vi.mocked(fetchProductsPage).mockRejectedValue({ userFriendlyMessage: 'Servidor caído' })
    const { store, dispatch } = makeStore()
    await dispatch(loadProductsThunk())
    expect(store.getState().products).toMatchObject({ status: 'failed', error: 'Servidor caído' })
  })

  it('sin sesión no llama al backend', async () => {
    const { store, dispatch } = makeStore(null)
    await dispatch(loadProductsThunk())
    expect(fetchProductsPage).not.toHaveBeenCalled()
    expect(store.getState().products.status).toBe('failed')
  })

  it('si llegan dos cargas seguidas se queda con la última aunque la primera termine después', async () => {
    let releaseFirst: (value: { items: never[]; meta: typeof meta }) => void = () => undefined
    vi.mocked(fetchProductsPage)
      .mockReturnValueOnce(new Promise((resolve) => (releaseFirst = resolve)))
      .mockResolvedValueOnce({
        items: [{ id: 'nuevo', code: 'N', name: 'N', brand: '', category: '', prices: { p0: 1, p1: 1, p2: 1, p3: 1 }, stockByWarehouse: {} }],
        meta,
      })
    const { store, dispatch } = makeStore()
    const first = dispatch(loadProductsThunk())
    await dispatch(loadProductsThunk())
    releaseFirst({ items: [], meta }) // la primera (vieja) responde tarde, con lista vacía
    await first
    expect(store.getState().products.items.map((p) => p.id)).toEqual(['nuevo'])
  })
})
