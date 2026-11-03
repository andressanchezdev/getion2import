// returns.thunks.test · carga, aprobación y creación de devoluciones contra un service simulado
import { configureStore } from '@reduxjs/toolkit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { returnsReducer, setReturnsWarehouse } from '../slices/returns.slice'
import { approveReturnThunk, createReturnThunk, loadReturnsThunk } from './returns.thunks'
import * as service from '../services/returns.service'
import type { ReturnDto } from '../types/returns.types'

vi.mock('../services/returns.service')
vi.mock('@/global/helpers/feedback/toast', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

const sample: ReturnDto = { id: 1, saleId: 5, customerId: 2, reason: 'Falla', resolutionType: 'exchange', status: 'pending', total: 100, createdAt: '2026-01-01' }
const makeStore = () => configureStore({ reducer: { returns: returnsReducer } })

describe('returns thunks', () => {
  beforeEach(() => vi.resetAllMocks())

  it('carga la lista con la bodega elegida', async () => {
    vi.mocked(service.fetchReturns).mockResolvedValue([sample])
    const store = makeStore()
    store.dispatch(setReturnsWarehouse(4))
    await store.dispatch(loadReturnsThunk())
    expect(service.fetchReturns).toHaveBeenCalledWith(4)
    expect(store.getState().returns.items).toEqual([sample])
    expect(store.getState().returns.loading).toBe(false)
  })

  it('guarda el error si la carga falla', async () => {
    vi.mocked(service.fetchReturns).mockRejectedValue(new Error('boom'))
    const store = makeStore()
    await store.dispatch(loadReturnsThunk())
    expect(store.getState().returns.error).toBeTruthy()
  })

  it('aprobar llama al service y recarga la lista', async () => {
    vi.mocked(service.approveReturn).mockResolvedValue()
    vi.mocked(service.fetchReturns).mockResolvedValue([{ ...sample, status: 'approved' }])
    const store = makeStore()
    await store.dispatch(approveReturnThunk(1))
    expect(service.approveReturn).toHaveBeenCalledWith(1)
    expect(store.getState().returns.items[0].status).toBe('approved')
  })

  it('crear rechaza con el mensaje si el service falla y no recarga', async () => {
    vi.mocked(service.createReturn).mockRejectedValue(new Error('sin stock'))
    const store = makeStore()
    const result = await store.dispatch(createReturnThunk({ saleId: 5, reason: 'x', resolutionType: 'exchange', items: [] }))
    expect(createReturnThunk.rejected.match(result)).toBe(true)
    expect(service.fetchReturns).not.toHaveBeenCalled()
  })
})
