// realtime.thunks · acciones para abrir, cerrar y resincronizar el tiempo real por websocket
// conecta con: api/config (WS_URL), global/helpers/storage/session.storage, realtime.service, realtime.sequencer, realtime.router, realtime.slice y app/store/realtimeRegistry
import { createAsyncThunk } from '@reduxjs/toolkit'
import type { AppDispatch, RootState } from '@/app/store/store'
import { ensureRealtimeRegistry, runActiveScreenResync } from '@/app/store/realtimeRegistry'
import { API_CONFIG } from '@/api'
import { logoutThunk } from '@/features/auth'
import { readSession } from '@/global/helpers/storage/session.storage'
import { createRealtimeConnection } from '../services/realtime.service'
import { evaluateRealtimeSequence } from '../helpers/realtime.sequencer'
import { routeRealtimeEvent } from '../helpers/realtime.router'
import { resetRealtimeState, setLastSeq, setRealtimeStatus } from '../slices/realtime.slice'
import type { RealtimeConnection } from '../types/realtime.types'

let connection: RealtimeConnection | null = null

const isRealtimeEnabled = (): boolean => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_REALTIME_ENABLED !== undefined) {
    const raw = String(import.meta.env.VITE_REALTIME_ENABLED).trim().toLowerCase()
    if (raw === 'false' || raw === '0') return false
  }
  return true
}

const closeConnection = () => {
  connection?.close()
  connection = null
}

export const resyncVisibleScreen = createAsyncThunk<
  void,
  void,
  { dispatch: AppDispatch; state: RootState }
>('realtime/resyncVisibleScreen', async (_, { dispatch, getState }) => {
  await runActiveScreenResync({ dispatch, getState })
})

export const startRealtime = createAsyncThunk<
  void,
  void,
  { dispatch: AppDispatch; state: RootState }
>('realtime/start', async (_, { dispatch, getState }) => {
  closeConnection()

  const token = readSession()?.accessToken
  if (!isRealtimeEnabled() || !token) {
    dispatch(setRealtimeStatus('idle'))
    return
  }

  ensureRealtimeRegistry()

  connection = createRealtimeConnection({
    getLastSeq: () => getState().realtime.lastSeq,
    fallbackWsUrl: API_CONFIG.WS_URL,
    onStatus: (status, error) => {
      dispatch(setRealtimeStatus({ status, error }))
    },
    onEvent: (event) => {
      const currentLastSeq = getState().realtime.lastSeq
      const decision = evaluateRealtimeSequence(event, currentLastSeq)
      if (decision.nextLastSeq !== currentLastSeq) {
        dispatch(setLastSeq(decision.nextLastSeq))
      }
      if (!decision.deliver) return
      routeRealtimeEvent(event, { dispatch, getState })
    },
    onSessionRevoked: (reason) => {
      void dispatch(logoutThunk(reason))
    },
    onResyncRequired: async (currentSeq) => {
      dispatch(setLastSeq(currentSeq))
      await dispatch(resyncVisibleScreen())
    },
  })
})

export const stopRealtime = createAsyncThunk<
  void,
  void,
  { dispatch: AppDispatch; state: RootState }
>('realtime/stop', async (_, { dispatch }) => {
  closeConnection()
  dispatch(resetRealtimeState())
})
