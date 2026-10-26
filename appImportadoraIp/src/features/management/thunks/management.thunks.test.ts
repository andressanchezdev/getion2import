// management.thunks.test · pruebas de la carga de pedidos por etapa: cuerpo enviado, etapa elegida, error, sin bodega y respuestas viejas
// conecta con: management.service/thunks/slice; el service y la sesión están simulados (no hay red)
import { configureStore } from '@reduxjs/toolkit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api'
import { navigationReducer, setActiveWarehouse } from '@/features/navigation'
import { fetchPipeline } from '../services/management.service'
import { managementReducer, selectChannel, selectStage, setOrdersPage } from '../slices/management.slice'
import { loadPipelineThunk, loadStageOrdersThunk } from './management.thunks'

vi.mock('@/api', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/api')
  return { ...actual, apiClient: { post: vi.fn() } }
})
vi.mock('@/features/auth', () => ({
  selectRequestContext: (state: { auth: { ctx: unknown } }) => state.auth.ctx,
}))

const ctx = { companyId: 3, userId: 7 }

const makeStore = (withWarehouse = true) => {
  const store = configureStore({ reducer: { auth: (state = { ctx }) => state, ui: navigationReducer, management: managementReducer } })
  if (withWarehouse) store.dispatch(setActiveWarehouse({ id: '4', name: 'Sur' }))
  return store
}

beforeEach(() => vi.clearAllMocks())

describe('fetchPipeline', () => {
  it('manda empresa, bodega y la etapa en minúscula, y convierte la respuesta', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true, data: { Verification: 13, Dispatch: 5 } } })
    const result = await fetchPipeline(ctx, 4, 'picking')
    expect(apiClient.post).toHaveBeenCalledWith('/management', { companyId: 3, warehouseId: 4, state: 'picking' })
    expect(result.stages[0].count).toBe(13)
  })

  it('acepta una respuesta sin data', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true } })
    expect((await fetchPipeline(ctx, 4, 'verification')).stages.every((s) => s.count === 0)).toBe(true)
  })
})

describe('loadPipelineThunk', () => {
  it('pide la etapa elegida y guarda los datos', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: { Verification: 13 } } })
    const store = makeStore()
    store.dispatch(selectStage('dispatch'))
    await store.dispatch(loadPipelineThunk() as never)
    expect(vi.mocked(apiClient.post).mock.calls[0][1]).toMatchObject({ warehouseId: 4, state: 'dispatch' })
    expect(store.getState().management).toMatchObject({ status: 'succeeded', selected: 'dispatch' })
    expect(store.getState().management.data?.stages[0].count).toBe(13)
  })

  it('sin bodega elegida no llama al backend y avisa', async () => {
    const store = makeStore(false)
    await store.dispatch(loadPipelineThunk() as never)
    expect(apiClient.post).not.toHaveBeenCalled()
    expect(store.getState().management.error).toBe('Elige una bodega para ver los pedidos por etapa.')
  })

  it('un error del backend queda en el estado y conserva los datos anteriores', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true, data: { Verification: 2 } } })
    const store = makeStore()
    await store.dispatch(loadPipelineThunk() as never)
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('boom'))
    await store.dispatch(loadPipelineThunk() as never)
    expect(store.getState().management.status).toBe('failed')
    expect(store.getState().management.data?.stages[0].count).toBe(2)
  })

  it('descarta la respuesta de una carga anterior', async () => {
    let resolveFirst: (value: { data: unknown }) => void = () => undefined
    vi.mocked(apiClient.post)
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce({ data: { success: true, data: { Verification: 99 } } })
    const store = makeStore()
    const first = store.dispatch(loadPipelineThunk() as never)
    await store.dispatch(loadPipelineThunk() as never)
    resolveFirst({ data: { success: true, data: { Verification: 1 } } })
    await first
    expect(store.getState().management.data?.stages[0].count).toBe(99)
  })
})

const META = { currentPage: 1, pageSize: 20, totalRecords: 13, totalPages: 1, hasNextPage: false, hasPrevPage: false }

describe('lista de pedidos de una etapa y un canal', () => {
  it('pide con etapa, canal, tipo de venta y página del estado, y guarda las filas', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: [{ saleId: 1, serialCode: 7, totalAmount: 10 }], meta: META } })
    const store = makeStore()
    store.dispatch(selectStage('picking'))
    store.dispatch(selectChannel('immediate'))
    store.dispatch(setOrdersPage(2))
    await store.dispatch(loadStageOrdersThunk() as never)
    expect(apiClient.post).toHaveBeenCalledWith('/management/saleOrders', { companyId: 3, warehouseId: 4, invoiceStatus: 'picking', saleChannel: 'immediate', saleType: 'sale', page: 2, pageSize: 20 })
    expect(store.getState().management.orders).toMatchObject({ status: 'succeeded', meta: META })
    expect(store.getState().management.orders.items[0]).toMatchObject({ id: 1, serialCode: 7 })
  })

  it('sin canal elegido no llama al backend', async () => {
    const store = makeStore()
    await store.dispatch(loadStageOrdersThunk() as never)
    expect(apiClient.post).not.toHaveBeenCalled()
    expect(store.getState().management.orders.status).toBe('failed')
  })

  it('sin bodega elegida no llama al backend', async () => {
    const store = makeStore(false)
    store.dispatch(selectChannel('corporate'))
    await store.dispatch(loadStageOrdersThunk() as never)
    expect(apiClient.post).not.toHaveBeenCalled()
    expect(store.getState().management.orders.error).toBe('Elige una bodega para ver los pedidos por etapa.')
  })

  it('cambiar de etapa o de canal olvida la lista y la página anteriores', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: [{ saleId: 1 }], meta: META } })
    const store = makeStore()
    store.dispatch(selectChannel('corporate'))
    store.dispatch(setOrdersPage(3))
    await store.dispatch(loadStageOrdersThunk() as never)
    store.dispatch(selectChannel('immediate'))
    expect(store.getState().management.orders).toMatchObject({ items: [], page: 1, status: 'idle' })
    store.dispatch(selectChannel('corporate'))
    await store.dispatch(loadStageOrdersThunk() as never)
    store.dispatch(selectStage('dispatch'))
    expect(store.getState().management).toMatchObject({ channel: null, orders: { items: [], page: 1 } })
  })

  it('un error del backend queda en el estado de la lista, no en el de los conteos', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('boom'))
    const store = makeStore()
    store.dispatch(selectChannel('corporate'))
    await store.dispatch(loadStageOrdersThunk() as never)
    expect(store.getState().management.orders.status).toBe('failed')
    expect(store.getState().management.status).toBe('idle')
  })

  it('descarta la respuesta de una carga anterior', async () => {
    let resolveFirst: (value: { data: unknown }) => void = () => undefined
    vi.mocked(apiClient.post)
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce({ data: { success: true, data: [{ saleId: 2 }], meta: META } })
    const store = makeStore()
    store.dispatch(selectChannel('corporate'))
    const first = store.dispatch(loadStageOrdersThunk() as never)
    await store.dispatch(loadStageOrdersThunk() as never)
    resolveFirst({ data: { success: true, data: [{ saleId: 1 }], meta: META } })
    await first
    expect(store.getState().management.orders.items.map((o) => o.id)).toEqual([2])
  })
})

