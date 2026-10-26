// realtime.service · conexión websocket con reconexión automática (espera creciente) y cierre limpio
// conecta con: realtime.adapter (mensajes), realtime.backoff (esperas); la crea realtime.thunks al iniciar sesión
// ojo: mejora sobre importadora-online: no hay URL fija en el código, la reconexión crece con cada intento y no escribe en consola
import { getReconnectDelay } from '../helpers/realtime.backoff'
import { parseRealtimeMessage } from '../helpers/realtime.adapter'
import type { RealtimeConnection, RealtimeConnectionOptions } from '../types/realtime.types'

export const createRealtimeConnection = ({ url, onEvent, onStatus }: RealtimeConnectionOptions): RealtimeConnection => {
  let socket: WebSocket | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let attempt = 0
  let isClosedByUser = false

  const connect = () => {
    onStatus('connecting')
    socket = new WebSocket(url)

    socket.onopen = () => {
      attempt = 0
      onStatus('open')
    }
    socket.onmessage = (message) => {
      const event = parseRealtimeMessage(message.data)
      if (event) onEvent(event)
    }
    socket.onclose = () => {
      onStatus('closed')
      if (isClosedByUser) return
      timer = setTimeout(connect, getReconnectDelay(attempt))
      attempt += 1
    }
  }

  connect()

  return {
    close: () => {
      isClosedByUser = true
      if (timer) clearTimeout(timer)
      socket?.close()
    },
    send: (message) => {
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
    },
  }
}
