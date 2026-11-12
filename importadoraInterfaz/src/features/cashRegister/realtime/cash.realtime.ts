// cash.realtime · manejadores en tiempo real del turno de caja: cash_session.totals_changed y cash_session.status_changed
// conecta con: cash.slice, cash.thunks y realtimeRegistry
// ojo: el turno es de quien lo abrió; el aviso de apertura solo sirve a esa misma persona en otra pestaña (lee su turno una vez)
import type { RealtimeHandlers } from '@/features/realtime'
import { cashSessionClosedFromEvent, cashTotalsFromEvent } from '../slices/cash.slice'
import { loadCashSessionThunk } from '../thunks/cash.thunks'
import type { CashState } from '../types/cash.types'

type CashRealtimeState = { cash?: CashState; auth?: { user?: { userId?: string | number; userType?: string } | null } }

export const cashRealtimeHandlers: RealtimeHandlers = {
  'cash_session.totals_changed': [
    (event, { dispatch }) => {
      dispatch(cashTotalsFromEvent(event.data))
    },
  ],
  'cash_session.status_changed': [
    (event, { dispatch, getState }) => {
      const { entity, to } = event.data
      if (to === 'closed') {
        dispatch(cashSessionClosedFromEvent(entity.id))
        return
      }
      const state = getState() as CashRealtimeState
      const user = state.auth?.user
      const mine = Boolean(user) && event.actor.id !== null && Number(user?.userId) === event.actor.id && (user?.userType ?? '').toLowerCase() === event.actor.type.toLowerCase()
      const warehouseId = state.cash?.warehouseId ?? null
      if (mine && warehouseId !== null && event.warehouseIds.includes(warehouseId) && !state.cash?.session && !state.cash?.saving) {
        void dispatch(loadCashSessionThunk(warehouseId) as never)
      }
    },
  ],
}
