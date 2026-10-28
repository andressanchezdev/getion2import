// realtime.slice · estado de la conexión en tiempo real: estado y hora del último evento
// conecta con: realtime.thunks (lo actualiza), realtime.selectors (lectura)
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RealtimeState, RealtimeStatus } from '../types/realtime.types'

const initialState: RealtimeState = { status: 'disabled', lastEventAt: null }

export const realtimeSlice = createSlice({
  name: 'realtime',
  initialState,
  reducers: {
    setRealtimeStatus: (state, action: PayloadAction<RealtimeStatus>) => {
      state.status = action.payload
    },
    eventReceived: (state) => {
      state.lastEventAt = Date.now()
    },
  },
})

export const { setRealtimeStatus, eventReceived } = realtimeSlice.actions
export const realtimeReducer = realtimeSlice.reducer
export default realtimeSlice.reducer
