// inventory.thunks.test · pruebas de la carga del control de inventario: lista, búsqueda, filtro, error y respuestas viejas
// conecta con: inventory.thunks y inventory.slice; el service y la sesión están simulados (no hay red)
import { configureStore } from '@reduxjs/toolkit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { navigationReducer, setActiveWarehouse } from '@/features/navigation'
import { inventoryReducer, setInventoryOnlyInStock, setInventoryPage, setInventoryQuery } from '../slices/inventory.slice'
import { loadInventoryThunk } from './inventory.thunks'
import { fetchInventoryPage, searchInventory } from '../services/inventory.service'
import type { StockItem } from '../types/inventory.types'

vi.mock('../services/inventory.service', () => ({ fetchInventoryPage: vi.fn(), searchInventory: vi.fn() }))
vi.mock('@/features/auth', () => ({
  selectRequestContext: (state: { auth: { ctx: unknown } }) => state.auth.ctx,
}))

const ctx = { companyId: 3, userId: 7 }
const meta = { currentPage: 1, pageSize: 30, totalRecords: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false }
const item: StockItem = { id: 1, code: 'A', name: 'A', brand: '', category: '', model: '', isActive: true, locations: [], warehouseStock: 0, physicalTotal: 0, reserved: 0, available: 0, minStock: 0, lowStock: false }

const makeStore = () => {
  const store = configureStore({ reducer: { auth: (state = { ctx }) => state, ui: navigationReducer, inventory: inventoryReducer } })
  store.dispatch(setActiveWarehouse({ id: '4', name: 'Sur' }))
  return store
}

beforeEach(() => vi.clearAllMocks())

describe('loadInventoryThunk', () => {
  it('sin texto pide la página con bodega y filtro de stock', async () => {
    vi.mocked(fetchInventoryPage).mockResolvedValue({ items: [item], meta })
    const store = makeStore()
    store.dispatch(setInventoryOnlyInStock(true))
    store.dispatch(setInventoryPage(2))
    await store.dispatch(loadInventoryThunk() as never)
    expect(fetchInventoryPage).toHaveBeenCalledWith(ctx, { page: 2, pageSize: 30, warehouseId: 4, onlyInStock: true })
    expect(store.getState().inventory).toMatchObject({ items: [item], status: 'succeeded', meta })
  })

  it('con texto usa la búsqueda y no hay paginación', async () => {
    vi.mocked(searchInventory).mockResolvedValue([item])
    const store = makeStore()
    store.dispatch(setInventoryQuery('filtro'))
    await store.dispatch(loadInventoryThunk() as never)
    expect(searchInventory).toHaveBeenCalledWith(ctx, 'filtro', 50, 4)
    expect(fetchInventoryPage).not.toHaveBeenCalled()
    expect(store.getState().inventory.meta).toBeNull()
  })

  it('cambiar la búsqueda o el filtro vuelve a la página 1', () => {
    const store = makeStore()
    store.dispatch(setInventoryPage(5))
    store.dispatch(setInventoryQuery('x'))
    expect(store.getState().inventory.page).toBe(1)
    store.dispatch(setInventoryPage(5))
    store.dispatch(setInventoryOnlyInStock(true))
    expect(store.getState().inventory.page).toBe(1)
  })

  it('un error del backend queda en el estado', async () => {
    vi.mocked(fetchInventoryPage).mockRejectedValue(new Error('boom'))
    const store = makeStore()
    await store.dispatch(loadInventoryThunk() as never)
    expect(store.getState().inventory.status).toBe('failed')
    expect(store.getState().inventory.error).toBeTruthy()
  })

  it('descarta la respuesta de una carga anterior', async () => {
    let resolveFirst: (value: { items: StockItem[]; meta: typeof meta }) => void = () => undefined
    vi.mocked(fetchInventoryPage)
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce({ items: [{ ...item, id: 2 }], meta })
    const store = makeStore()
    const first = store.dispatch(loadInventoryThunk() as never)
    await store.dispatch(loadInventoryThunk() as never)
    resolveFirst({ items: [item], meta })
    await first
    expect(store.getState().inventory.items.map((row) => row.id)).toEqual([2])
  })
})
