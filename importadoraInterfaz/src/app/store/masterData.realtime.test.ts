// masterData.realtime.test · un dato maestro creado o editado por otro usuario vuelve a pedir su lista una sola vez, y solo si ya estaba cargada
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MASTER_RELOAD_DELAY_MS, reloadMasterListSoon } from './masterData.realtime'

type Api = Parameters<typeof reloadMasterListSoon>[1]

const apiWith = (companiesStatus: string) => {
  const dispatch = vi.fn()
  const getState = () => ({ companies: { status: companiesStatus } })
  return { api: { dispatch, getState } as unknown as Api, dispatch }
}

describe('reloadMasterListSoon', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('varios eventos seguidos del mismo dato piden la lista una sola vez', () => {
    const { api, dispatch } = apiWith('succeeded')
    reloadMasterListSoon('company', api)
    reloadMasterListSoon('company', api)
    reloadMasterListSoon('company', api)
    expect(dispatch).not.toHaveBeenCalled()
    vi.advanceTimersByTime(MASTER_RELOAD_DELAY_MS)
    expect(dispatch).toHaveBeenCalledTimes(1)
  })

  it('si la lista no estaba cargada no se pide nada', () => {
    const { api, dispatch } = apiWith('idle')
    reloadMasterListSoon('company', api)
    vi.advanceTimersByTime(MASTER_RELOAD_DELAY_MS)
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('un dato sin tabla propia (por ejemplo una serie de documentos) se ignora', () => {
    const { api, dispatch } = apiWith('succeeded')
    reloadMasterListSoon('doc_series', api)
    vi.advanceTimersByTime(MASTER_RELOAD_DELAY_MS)
    expect(dispatch).not.toHaveBeenCalled()
  })
})
