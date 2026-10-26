// sales.thunks.test · pruebas de la carga del historial y los pendientes: éxito, error, sin bodega y respuestas viejas
// conecta con: sales.thunks y sales.slice; el service y la sesión están simulados (no hay red)
import { configureStore } from '@reduxjs/toolkit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { navigationReducer, setActiveWarehouse } from '@/features/navigation'
import { salesReducer, setHistoryPage } from '../slices/sales.slice'
import { cancelSaleThunk, loadPendingCartsThunk, loadSalesHistoryThunk } from './sales.thunks'
import { fetchPendingCarts, fetchSalesHistory } from '../services/sales.service'
import { cancelSale } from '@/features/shop'
import { toast } from '@/global/helpers/toast'

vi.mock('../services/sales.service', () => ({ fetchSalesHistory: vi.fn(), fetchPendingCarts: vi.fn() }))
vi.mock('@/features/shop', () => ({ cancelSale: vi.fn() }))
vi.mock('@/global/helpers/toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/features/auth', () => ({
  selectRequestContext: (state: { auth: { ctx: unknown } }) => state.auth.ctx,
}))

const ctx = { companyId: 3, userId: 7 }
const meta = { currentPage: 1, pageSize: 30, totalRecords: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false }
const sale = { id: 1, serialCode: 10, customerName: 'Ana', sellerName: 'Luis', status: 'picking', totalAmount: 5, paidAmount: 0, createdAt: '2026-10-20' }

const makeStore = (withWarehouse = true) => {
  const store = configureStore({
    reducer: { auth: (state = { ctx }) => state, ui: navigationReducer, sales: salesReducer },
  })
  if (withWarehouse) store.dispatch(setActiveWarehouse({ id: '4', name: 'Sur' }))
  return store
}

beforeEach(() => vi.clearAllMocks())

describe('loadSalesHistoryThunk', () => {
  it('guarda las ventas y la paginación; pide la página del estado y la bodega activa', async () => {
    vi.mocked(fetchSalesHistory).mockResolvedValue({ items: [sale], meta })
    const store = makeStore()
    store.dispatch(setHistoryPage(2))
    await store.dispatch(loadSalesHistoryThunk() as never)
    expect(fetchSalesHistory).toHaveBeenCalledWith(ctx, 4, 2, 30)
    expect(store.getState().sales.history).toMatchObject({ items: [sale], status: 'succeeded', meta })
  })

  it('un error del backend queda en el estado (hoy /sales/history responde 500)', async () => {
    vi.mocked(fetchSalesHistory).mockRejectedValue(new Error('boom'))
    const store = makeStore()
    await store.dispatch(loadSalesHistoryThunk() as never)
    expect(store.getState().sales.history.status).toBe('failed')
    expect(store.getState().sales.history.error).toBeTruthy()
  })

  it('sin bodega elegida no llama al backend y avisa', async () => {
    const store = makeStore(false)
    await store.dispatch(loadSalesHistoryThunk() as never)
    expect(fetchSalesHistory).not.toHaveBeenCalled()
    expect(store.getState().sales.history.error).toBe('Elige una bodega para ver las ventas.')
  })

  it('descarta la respuesta de una carga anterior', async () => {
    let resolveFirst: (value: { items: typeof sale[]; meta: typeof meta }) => void = () => undefined
    vi.mocked(fetchSalesHistory)
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce({ items: [{ ...sale, id: 2 }], meta })
    const store = makeStore()
    const first = store.dispatch(loadSalesHistoryThunk() as never)
    await store.dispatch(loadSalesHistoryThunk() as never)
    resolveFirst({ items: [sale], meta })
    await first
    expect(store.getState().sales.history.items.map((row) => row.id)).toEqual([2])
  })
})

describe('loadPendingCartsThunk', () => {
  it('guarda los carritos pendientes', async () => {
    const cart = { uuid: 'u', customerId: null, customerName: 'Sin cliente', sellerName: 'Luis', lines: 1, units: 2, totalAmount: 9, createdAt: '' }
    vi.mocked(fetchPendingCarts).mockResolvedValue({ items: [cart], meta })
    const store = makeStore()
    await store.dispatch(loadPendingCartsThunk() as never)
    expect(fetchPendingCarts).toHaveBeenCalledWith(ctx, 4, 1, 30)
    expect(store.getState().sales.pending.items).toEqual([cart])
  })
})

describe('cancelSaleThunk', () => {
  it('anula con el usuario de la sesión, avisa y vuelve a leer el historial', async () => {
    vi.mocked(cancelSale).mockResolvedValue(undefined)
    vi.mocked(fetchSalesHistory).mockResolvedValue({ items: [sale], meta })
    const store = makeStore()
    const result = await store.dispatch(cancelSaleThunk({ saleId: 91486, reason: 'Cliente desistió' }) as never)
    expect((result as { type: string }).type).toBe('sales/cancel/fulfilled')
    expect(cancelSale).toHaveBeenCalledWith(ctx, { saleId: 91486, reason: 'Cliente desistió' })
    expect(toast.success).toHaveBeenCalledWith('Venta anulada.')
    expect(fetchSalesHistory).toHaveBeenCalledTimes(1)
  })

  it('si el backend la rechaza avisa, no recarga el historial y queda rechazada', async () => {
    vi.mocked(cancelSale).mockRejectedValue(new Error('boom'))
    const store = makeStore()
    const result = await store.dispatch(cancelSaleThunk({ saleId: 1, reason: 'Motivo válido' }) as never)
    expect((result as { type: string }).type).toBe('sales/cancel/rejected')
    expect(toast.error).toHaveBeenCalled()
    expect(fetchSalesHistory).not.toHaveBeenCalled()
  })
})
