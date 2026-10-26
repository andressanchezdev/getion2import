// warehouses.thunks.test · pruebas de la carga de bodegas: éxito, error y sin sesión
// conecta con: warehouses.thunks y warehouses.slice; el service y la sesión están simulados (no hay red)
import { configureStore, type ThunkDispatch, type UnknownAction } from '@reduxjs/toolkit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthState } from '@/features/auth'
import type { WarehousesState } from '../types/warehouse.types'
import { warehousesReducer } from '../slices/warehouses.slice'
import { fetchWarehousesThunk } from './warehouses.thunks'
import { fetchWarehouses } from '../services/warehouses.service'

vi.mock('../services/warehouses.service', () => ({ fetchWarehouses: vi.fn() }))
vi.mock('@/features/auth', () => ({
  selectRequestContext: (state: { auth: { ctx: unknown } }) => state.auth.ctx,
}))

const ctx = { companyId: 3, userId: 7 }

// ojo: el dispatch se tipa a mano para aceptar thunks que leen state.auth (el store de prueba solo tiene los slices que se prueban)
const makeStore = (sessionCtx: unknown = ctx) => {
  const store = configureStore({
    reducer: { auth: (state = { ctx: sessionCtx } as unknown as AuthState) => state, warehouses: warehousesReducer },
  })
  const dispatch = store.dispatch as unknown as ThunkDispatch<{ auth: AuthState; warehouses: WarehousesState }, undefined, UnknownAction>
  return { store, dispatch }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('warehouses.thunks', () => {
  it('guarda las bodegas que devuelve el service', async () => {
    vi.mocked(fetchWarehouses).mockResolvedValue([{ id: '1', name: 'Principal', isDefault: true }])
    const { store, dispatch } = makeStore()
    await dispatch(fetchWarehousesThunk())
    expect(fetchWarehouses).toHaveBeenCalledWith(ctx)
    expect(store.getState().warehouses.status).toBe('succeeded')
    expect(store.getState().warehouses.items).toHaveLength(1)
  })

  it('si falla deja el mensaje y el estado "failed"', async () => {
    vi.mocked(fetchWarehouses).mockRejectedValue({ userFriendlyMessage: 'Sin conexión' })
    const { store, dispatch } = makeStore()
    await dispatch(fetchWarehousesThunk())
    expect(store.getState().warehouses.status).toBe('failed')
    expect(store.getState().warehouses.error).toBe('Sin conexión')
  })

  it('no pide otra vez si ya hay una carga en curso', async () => {
    vi.mocked(fetchWarehouses).mockReturnValue(new Promise(() => undefined))
    const { dispatch } = makeStore()
    dispatch(fetchWarehousesThunk())
    dispatch(fetchWarehousesThunk())
    expect(fetchWarehouses).toHaveBeenCalledTimes(1)
  })

  it('sin sesión no llama al backend', async () => {
    const { store, dispatch } = makeStore(null)
    await dispatch(fetchWarehousesThunk())
    expect(fetchWarehouses).not.toHaveBeenCalled()
    expect(store.getState().warehouses.status).toBe('failed')
  })
})
