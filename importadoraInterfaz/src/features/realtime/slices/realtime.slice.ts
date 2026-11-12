// realtime.slice · estado de la conexión en tiempo real: status, lastSeq, connectedAt, lastError y replaying
// conecta con: realtime.thunks y useRealtimeStatus; NO está en la whitelist de redux-persist (sección 16.3)
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RealtimeState, RealtimeStatus } from '../types/realtime.types'

const initialState: RealtimeState = {
  status: 'idle',
  lastSeq: null,
  connectedAt: null,
  lastError: null,
  replaying: false,
}

export const realtimeSlice = createSlice({
  name: 'realtime',
  initialState,
  reducers: {
    setRealtimeStatus: (
      state,
      action: PayloadAction<RealtimeStatus | { status: RealtimeStatus; error?: string | null }>
    ) => {
      const nextStatus = typeof action.payload === 'string' ? action.payload : action.payload.status
      const nextError = typeof action.payload === 'string' ? null : (action.payload.error ?? null)
      state.status = nextStatus
      state.replaying = nextStatus === 'replaying'
      if (nextStatus === 'live' && state.connectedAt === null) {
        state.connectedAt = Date.now()
      }
      if (nextStatus === 'idle') {
        state.connectedAt = null
      }
      state.lastError = nextError
    },
    setLastSeq: (state, action: PayloadAction<number | null>) => {
      state.lastSeq = action.payload
    },
    resetRealtimeState: () => initialState,
  },
})

export const { setRealtimeStatus, setLastSeq, resetRealtimeState } = realtimeSlice.actions
export const realtimeReducer = realtimeSlice.reducer
export default realtimeSlice.reducer
