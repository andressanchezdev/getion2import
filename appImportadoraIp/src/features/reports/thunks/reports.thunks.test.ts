// reports.thunks.test · pruebas de la carga de reportes: éxito, error, rango inválido, sin bodega y respuestas viejas
// conecta con: reports.thunks y reports.slice; el service y la sesión están simulados (no hay red)
import { configureStore } from '@reduxjs/toolkit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { navigationReducer, setActiveWarehouse } from '@/features/navigation'
import { reportsReducer, setDailyRange, setGeneralRange } from '../slices/reports.slice'
import { loadFinancialReportThunk, loadInventoryReportThunk, loadSalesReportThunk } from './reports.thunks'
import { fetchFinancialReport, fetchInventoryReport, fetchSalesSummary } from '../services/reports.service'

vi.mock('../services/reports.service', () => ({
  fetchSalesSummary: vi.fn(),
  fetchFinancialReport: vi.fn(),
  fetchCustomerReport: vi.fn(),
  fetchInventoryReport: vi.fn(),
}))
vi.mock('@/features/auth', () => ({
  selectRequestContext: (state: { auth: { ctx: unknown } }) => state.auth.ctx,
}))

const ctx = { companyId: 3, userId: 7 }
const result = { metrics: [{ key: 'revenue', label: 'Ingresos', value: 10, format: 'money' as const }], generatedAt: '2026-10-24T12:00:00Z' }

const makeStore = (withWarehouse = true) => {
  const store = configureStore({ reducer: { auth: (state = { ctx }) => state, ui: navigationReducer, reports: reportsReducer } })
  if (withWarehouse) store.dispatch(setActiveWarehouse({ id: '4', name: 'Sur' }))
  return store
}

beforeEach(() => vi.clearAllMocks())

describe('reportes', () => {
  it('ventas: pide con el rango diario y la bodega activa y guarda las tarjetas', async () => {
    vi.mocked(fetchSalesSummary).mockResolvedValue(result)
    const store = makeStore()
    store.dispatch(setDailyRange({ start: '2026-10-20', end: '2026-10-22' }))
    await store.dispatch(loadSalesReportThunk() as never)
    expect(fetchSalesSummary).toHaveBeenCalledWith(ctx, { start: '2026-10-20', end: '2026-10-22' }, 4)
    expect(store.getState().reports.sales).toMatchObject({ status: 'succeeded', metrics: result.metrics })
  })

  it('un rango con inicio posterior al fin no llama al backend', async () => {
    const store = makeStore()
    store.dispatch(setGeneralRange({ start: '2026-10-25', end: '2026-10-24' }))
    await store.dispatch(loadFinancialReportThunk() as never)
    expect(fetchFinancialReport).not.toHaveBeenCalled()
    expect(store.getState().reports.financial).toMatchObject({ status: 'failed', error: 'La fecha inicial no puede ser posterior a la final.' })
  })

  it('ventas e inventario sin bodega elegida no llaman al backend', async () => {
    const store = makeStore(false)
    await store.dispatch(loadSalesReportThunk() as never)
    await store.dispatch(loadInventoryReportThunk() as never)
    expect(fetchSalesSummary).not.toHaveBeenCalled()
    expect(fetchInventoryReport).not.toHaveBeenCalled()
    expect(store.getState().reports.inventory.error).toBe('Elige una bodega para ver este reporte.')
  })

  it('el reporte financiero no necesita bodega', async () => {
    vi.mocked(fetchFinancialReport).mockResolvedValue(result)
    const store = makeStore(false)
    await store.dispatch(loadFinancialReportThunk() as never)
    expect(store.getState().reports.financial.status).toBe('succeeded')
  })

  it('un error del backend queda en el estado de ese reporte', async () => {
    vi.mocked(fetchInventoryReport).mockRejectedValue(new Error('boom'))
    const store = makeStore()
    await store.dispatch(loadInventoryReportThunk() as never)
    expect(store.getState().reports.inventory.status).toBe('failed')
    expect(store.getState().reports.inventory.error).toBeTruthy()
  })

  it('descarta la respuesta de una carga anterior', async () => {
    let resolveFirst: (value: typeof result) => void = () => undefined
    vi.mocked(fetchSalesSummary)
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce({ metrics: [{ key: 'revenue', label: 'Ingresos', value: 99, format: 'money' }], generatedAt: '' })
    const store = makeStore()
    const first = store.dispatch(loadSalesReportThunk() as never)
    await store.dispatch(loadSalesReportThunk() as never)
    resolveFirst(result)
    await first
    expect(store.getState().reports.sales.metrics[0].value).toBe(99)
  })
})
