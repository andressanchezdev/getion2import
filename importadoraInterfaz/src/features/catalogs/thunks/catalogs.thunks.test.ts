// catalogs.thunks.test · pruebas de la carga de catálogos: éxito, error, sin sesión y estado del slice
// conecta con: catalogs.thunks y catalogs.slice; el service y la sesión están simulados (no hay red ni store real de la app)
import { configureStore, type ThunkDispatch, type UnknownAction } from '@reduxjs/toolkit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthState } from '@/features/auth'
import type { CatalogsState } from '../types/catalogs.types'
import { catalogsReducer } from '../slices/catalogs.slice'
import { fetchBrandsThunk, fetchCategoriesThunk, fetchMotoModelsThunk } from './catalogs.thunks'
import { fetchBrands, fetchCategories, fetchMotoModels } from '../services/catalogs.service'

vi.mock('../services/catalogs.service', () => ({
  fetchBrands: vi.fn(),
  fetchCategories: vi.fn(),
  fetchMotoModels: vi.fn(),
}))

// la sesión se simula: el thunk solo necesita selectRequestContext
vi.mock('@/features/auth', () => ({
  selectRequestContext: (state: { auth: { ctx: unknown } }) => state.auth.ctx,
}))

const ctx = { companyId: 3, userId: 7 }

// ojo: el dispatch se tipa a mano para aceptar thunks que leen state.auth (el store de prueba solo tiene los slices que se prueban)
const makeStore = (sessionCtx: unknown = ctx) => {
  const store = configureStore({
    reducer: { auth: (state = { ctx: sessionCtx } as unknown as AuthState) => state, catalogs: catalogsReducer },
  })
  const dispatch = store.dispatch as unknown as ThunkDispatch<{ auth: AuthState; catalogs: CatalogsState }, undefined, UnknownAction>
  return { store, dispatch }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('catalogs.thunks', () => {
  it('carga las marcas con el contexto de la sesión y las guarda', async () => {
    vi.mocked(fetchBrands).mockResolvedValue([{ id: 1, name: 'Yamaha' }])
    const { store, dispatch } = makeStore()
    await dispatch(fetchBrandsThunk())
    expect(fetchBrands).toHaveBeenCalledWith(ctx)
    expect(store.getState().catalogs.brands).toEqual({ items: [{ id: 1, name: 'Yamaha' }], status: 'succeeded', error: null })
  })

  it('pasa por "loading" mientras espera', async () => {
    let release: (value: never[]) => void = () => undefined
    vi.mocked(fetchCategories).mockReturnValue(new Promise((resolve) => (release = resolve)))
    const { store, dispatch } = makeStore()
    const pending = dispatch(fetchCategoriesThunk())
    expect(store.getState().catalogs.categories.status).toBe('loading')
    release([])
    await pending
    expect(store.getState().catalogs.categories.status).toBe('succeeded')
  })

  it('si el backend falla guarda el mensaje y deja el estado en "failed"', async () => {
    vi.mocked(fetchMotoModels).mockRejectedValue({ userFriendlyMessage: 'Servidor caído' })
    const { store, dispatch } = makeStore()
    await dispatch(fetchMotoModelsThunk())
    expect(store.getState().catalogs.models.status).toBe('failed')
    expect(store.getState().catalogs.models.error).toBe('Servidor caído')
  })

  it('sin sesión no llama al backend', async () => {
    const { store, dispatch } = makeStore(null)
    await dispatch(fetchBrandsThunk())
    expect(fetchBrands).not.toHaveBeenCalled()
    expect(store.getState().catalogs.brands.status).toBe('failed')
  })

  it('un catálogo no afecta a los otros', async () => {
    vi.mocked(fetchBrands).mockResolvedValue([{ id: 1, name: 'AKT' }])
    const { store, dispatch } = makeStore()
    await dispatch(fetchBrandsThunk())
    expect(store.getState().catalogs.categories.status).toBe('idle')
    expect(store.getState().catalogs.models.status).toBe('idle')
  })
})
