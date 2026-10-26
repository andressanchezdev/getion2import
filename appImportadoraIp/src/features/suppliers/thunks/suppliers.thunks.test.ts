// suppliers.thunks.test · pruebas de la carga de proveedores: éxito, búsqueda, error, totales y respuestas viejas
// conecta con: suppliers.thunks y suppliers.slice; el service y la sesión están simulados (no hay red)
import { configureStore } from '@reduxjs/toolkit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setSuppliersPage, setSuppliersQuery, suppliersReducer } from '../slices/suppliers.slice'
import { loadSuppliersSummaryThunk, loadSuppliersThunk } from './suppliers.thunks'
import { fetchSuppliersPage, fetchSuppliersSummary } from '../services/suppliers.service'

vi.mock('../services/suppliers.service', () => ({ fetchSuppliersPage: vi.fn(), fetchSuppliersSummary: vi.fn() }))
vi.mock('@/features/auth', () => ({
  selectRequestContext: (state: { auth: { ctx: unknown } }) => state.auth.ctx,
}))

const ctx = { companyId: 3, userId: 7 }
const meta = { currentPage: 1, pageSize: 30, totalRecords: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false }
const supplier = { id: 1, name: 'A', document: '', contactName: '', contactPhone: '', contactEmail: '', city: '', paymentTerms: 0, creditLimit: 0, isActive: true, createdAt: '' }

const makeStore = () => configureStore({ reducer: { auth: (state = { ctx }) => state, suppliers: suppliersReducer } })

beforeEach(() => vi.clearAllMocks())

describe('loadSuppliersThunk', () => {
  it('pide con la página y la búsqueda del estado y guarda la lista', async () => {
    vi.mocked(fetchSuppliersPage).mockResolvedValue({ items: [supplier], meta })
    const store = makeStore()
    store.dispatch(setSuppliersPage(3))
    store.dispatch(setSuppliersQuery('moto')) // al buscar vuelve a la página 1
    await store.dispatch(loadSuppliersThunk() as never)
    expect(fetchSuppliersPage).toHaveBeenCalledWith(ctx, 1, 30, 'moto')
    expect(store.getState().suppliers).toMatchObject({ items: [supplier], status: 'succeeded', meta })
  })

  it('un error del backend queda en el estado', async () => {
    vi.mocked(fetchSuppliersPage).mockRejectedValue(new Error('boom'))
    const store = makeStore()
    await store.dispatch(loadSuppliersThunk() as never)
    expect(store.getState().suppliers.status).toBe('failed')
    expect(store.getState().suppliers.error).toBeTruthy()
  })

  it('descarta la respuesta de una carga anterior', async () => {
    let resolveFirst: (value: { items: typeof supplier[]; meta: typeof meta }) => void = () => undefined
    vi.mocked(fetchSuppliersPage)
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce({ items: [{ ...supplier, id: 2 }], meta })
    const store = makeStore()
    const first = store.dispatch(loadSuppliersThunk() as never)
    await store.dispatch(loadSuppliersThunk() as never)
    resolveFirst({ items: [supplier], meta })
    await first
    expect(store.getState().suppliers.items.map((row) => row.id)).toEqual([2])
  })
})

describe('loadSuppliersSummaryThunk', () => {
  it('guarda los totales y, si falla, deja el error sin tocar la lista', async () => {
    vi.mocked(fetchSuppliersSummary).mockResolvedValueOnce({ total: 26, active: 20, products: 1, totalCreditLimit: 2 })
    const store = makeStore()
    await store.dispatch(loadSuppliersSummaryThunk() as never)
    expect(store.getState().suppliers.summary).toMatchObject({ status: 'succeeded', data: { total: 26 } })

    vi.mocked(fetchSuppliersSummary).mockRejectedValueOnce(new Error('x'))
    await store.dispatch(loadSuppliersSummaryThunk() as never)
    expect(store.getState().suppliers.summary.status).toBe('failed')
    expect(store.getState().suppliers.status).toBe('idle')
  })
})
