// realtime.thunks · acciones para abrir y cerrar la conexión en tiempo real
// conecta con: api/config (WS_URL), global/session.storage (token), realtime.service, realtime.handlers y realtime.slice; las llama useRealtime
// ojo: la conexión vive fuera de redux (no es serializable); si no hay WS_URL o token, el tiempo real queda "disabled" y no se conecta a nada
import { createAsyncThunk } from '@reduxjs/toolkit'
import { API_CONFIG } from '@/api'
import { readSession } from '@/global/helpers/session.storage'
import { createRealtimeConnection } from '../services/realtime.service'
import { handleRealtimeEvent } from '../helpers/realtime.handlers'
import { buildSocketUrl } from '../helpers/realtime.url'
import { eventReceived, setRealtimeStatus } from '../slices/realtime.slice'
import type { RealtimeConnection } from '../types/realtime.types'

let connection: RealtimeConnection | null = null

const closeConnection = () => {
  connection?.close()
  connection = null
}

export const startRealtime = createAsyncThunk('realtime/start', async (_: void, { dispatch }) => {
  closeConnection()
  const token = readSession()?.accessToken
  if (!API_CONFIG.WS_URL || !token) {
    dispatch(setRealtimeStatus('disabled'))
    return
  }

  connection = createRealtimeConnection({
    url: buildSocketUrl(API_CONFIG.WS_URL, token),
    onStatus: (status) => dispatch(setRealtimeStatus(status)),
    onEvent: (event) => {
      dispatch(eventReceived())
      handleRealtimeEvent(event, dispatch)
    },
  })
})

export const stopRealtime = createAsyncThunk('realtime/stop', async (_: void, { dispatch }) => {
  closeConnection()
  dispatch(setRealtimeStatus('disabled'))
})
