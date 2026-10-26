// quotations.thunks.test · pruebas del servicio y la carga de cotizaciones: cuerpo enviado, paginación convertida, filtro, error y respuestas viejas
// conecta con: quotations.service/thunks/slice; el cliente HTTP y la sesión están simulados (no hay red)
import { configureStore } from '@reduxjs/toolkit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api'
import { fetchQuotationsPage, fetchQuotationStats } from '../services/quotations.service'
import { quotationsReducer, setQuotationsFilter, setQuotationsPage } from '../slices/quotations.slice'
import { loadQuotationsThunk, loadQuotationStatsThunk } from './quotations.thunks'

vi.mock('@/api', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/api')
  return { ...actual, apiClient: { post: vi.fn(), get: vi.fn() } }
})
vi.mock('@/features/auth', () => ({
  selectRequestContext: (state: { auth: { ctx: unknown } }) => state.auth.ctx,
}))

const ctx = { companyId: 1, userId: 948 }
const row = { quotationId: 1, quotationNumber: 'QT-1', totalAmount: 1190, status: 'sent', validUntil: '2999-01-01T00:00:00Z' }
const reply = (rows: unknown[], extra: object = {}) => ({ data: { success: true, data: { data: rows, page: 1, pageSize: 20, totalRows: rows.length, totalPages: rows.length ? 1 : 0, ...extra } } })

const makeStore = () => configureStore({ reducer: { auth: (state = { ctx }) => state, quotations: quotationsReducer } })

beforeEach(() => vi.clearAllMocks())

describe('fetchQuotationsPage', () => {
  it('no manda sellerId ni userId (juntos dejaban la lista vacía) y solo manda el estado si hay filtro', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(reply([row]))
    await fetchQuotationsPage(ctx, 1, 20, '')
    expect(apiClient.post).toHaveBeenLastCalledWith('/quotations', { companyId: 1, page: 1, pageSize: 20 })
    await fetchQuotationsPage(ctx, 2, 20, 'draft')
    expect(apiClient.post).toHaveBeenLastCalledWith('/quotations', { companyId: 1, page: 2, pageSize: 20, status: 'draft' })
  })

  it('convierte la paginación que viene dentro de data al meta estándar', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(reply([row], { page: 2, totalRows: 45, totalPages: 3 }))
    const result = await fetchQuotationsPage(ctx, 2, 20, '')
    expect(result.meta).toEqual({ currentPage: 2, pageSize: 20, totalRecords: 45, totalPages: 3, hasNextPage: true, hasPrevPage: true })
    expect(result.items[0]).toMatchObject({ id: 1, number: 'QT-1', totalAmount: 1190, expired: false })
  })

  it('acepta una respuesta vacía o sin data', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } })
    expect((await fetchQuotationsPage(ctx, 1, 20, '')).items).toEqual([])
  })
})

describe('fetchQuotationStats', () => {
  it('usa GET /quotations/stats sin parámetros (la empresa sale del token)', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: { totalQuotations: 10, draftCount: 9, sentCount: 1, totalValue: 11900 } } })
    expect(await fetchQuotationStats()).toMatchObject({ total: 10, drafts: 9, sent: 1, totalValue: 11900 })
    expect(apiClient.get).toHaveBeenCalledWith('/quotations/stats')
  })
})

describe('loadQuotationsThunk', () => {
  it('pide con la página y el filtro del estado y guarda las filas', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(reply([row]))
    const store = makeStore()
    store.dispatch(setQuotationsFilter('sent'))
    await store.dispatch(loadQuotationsThunk() as never)
    expect(vi.mocked(apiClient.post).mock.calls[0][1]).toMatchObject({ page: 1, status: 'sent' })
    expect(store.getState().quotations).toMatchObject({ status: 'succeeded', items: [{ id: 1 }] })
  })

  it('cambiar el filtro vuelve a la página 1', () => {
    const store = makeStore()
    store.dispatch(setQuotationsPage(4))
    store.dispatch(setQuotationsFilter('draft'))
    expect(store.getState().quotations.page).toBe(1)
  })

  it('un error queda en la lista y no en los totales', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('boom'))
    const store = makeStore()
    await store.dispatch(loadQuotationsThunk() as never)
    expect(store.getState().quotations.status).toBe('failed')
    expect(store.getState().quotations.stats.status).toBe('idle')
  })

  it('descarta la respuesta de una carga anterior', async () => {
    let resolveFirst: (value: unknown) => void = () => undefined
    vi.mocked(apiClient.post)
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce(reply([{ ...row, quotationId: 2 }]))
    const store = makeStore()
    const first = store.dispatch(loadQuotationsThunk() as never)
    await store.dispatch(loadQuotationsThunk() as never)
    resolveFirst(reply([row]))
    await first
    expect(store.getState().quotations.items.map((q) => q.id)).toEqual([2])
  })
})

describe('loadQuotationStatsThunk', () => {
  it('guarda los totales y, si falla, deja el error sin tocar la lista', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { success: true, data: { totalQuotations: 10 } } })
    const store = makeStore()
    await store.dispatch(loadQuotationStatsThunk() as never)
    expect(store.getState().quotations.stats).toMatchObject({ status: 'succeeded', data: { total: 10 } })
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('x'))
    await store.dispatch(loadQuotationStatsThunk() as never)
    expect(store.getState().quotations.stats.status).toBe('failed')
    expect(store.getState().quotations.status).toBe('idle')
  })
})
