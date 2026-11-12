// returns.realtime.test · las devoluciones de otros usuarios entran y cambian de estado por evento
import { describe, expect, it } from 'vitest'
import { INITIAL_RETURNS_STATE } from '../constants/returns.constants'
import { returnCreatedFromEvent, returnsReducer, returnStatusFromEvent } from '../slices/returns.slice'
import type { ReturnDto } from '../types/returns.types'

const ret: ReturnDto = { id: 3, saleId: 70, warehouseId: 7, customerId: 4, reason: 'Pieza rota', resolutionType: 'credit_balance', status: 'pending', total: 50000, createdAt: '2026-11-12T10:00:00Z' }

describe('devoluciones en tiempo real', () => {
  it('return.created entra una sola vez y respeta el filtro de bodega', () => {
    const once = returnsReducer(INITIAL_RETURNS_STATE, returnCreatedFromEvent(ret))
    expect(returnsReducer(once, returnCreatedFromEvent(ret)).items).toHaveLength(1)
    expect(returnsReducer({ ...INITIAL_RETURNS_STATE, warehouseId: 8 }, returnCreatedFromEvent(ret)).items).toHaveLength(0)
    expect(returnsReducer({ ...INITIAL_RETURNS_STATE, warehouseId: 7 }, returnCreatedFromEvent(ret)).items).toHaveLength(1)
  })
  it('return.status_changed cambia el estado y anota quién la resolvió', () => {
    const state = returnsReducer({ ...INITIAL_RETURNS_STATE, items: [ret] }, returnStatusFromEvent({ id: 3, to: 'approved', by: 'Pedro' }))
    expect(state.items[0]).toMatchObject({ status: 'approved', approvedByName: 'Pedro' })
  })
})
