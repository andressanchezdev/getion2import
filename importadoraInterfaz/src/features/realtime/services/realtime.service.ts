// realtime.service · máquina de estados de la conexión websocket (sección 16.1): pide ticket, abre socket, envía hello y reconecta según el código de cierre
// conecta con: realtime.ticket (POST /realtime/ticket), realtime.adapter (parseEnvelope), realtime.backoff y realtime.constants
import {
  HELLO_TIMEOUT_MS,
  REALTIME_CLOSE_CODES,
  TICKET_RETRY_LIMIT,
} from '../constants/realtime.constants'
import { parseEnvelope } from '../helpers/realtime.adapter'
import { getReconnectDelay } from '../helpers/realtime.backoff'
import { requestTicket as defaultRequestTicket } from './realtime.ticket'
import type { ClientMessage } from '../types/realtime.contract'
import type { RealtimeConnection, RealtimeConnectionOptions } from '../types/realtime.types'

const buildWsUrlWithTicket = (baseUrl: string, ticket: string): string => {
  const separator = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${separator}ticket=${encodeURIComponent(ticket)}`
}

export const createRealtimeConnection = ({
  getLastSeq,
  requestTicket = defaultRequestTicket,
  fallbackWsUrl = '',
  createWebSocket = (url: string) => new WebSocket(url),
  onStatus,
  onEvent,
  onSessionRevoked,
  onResyncRequired,
}: RealtimeConnectionOptions): RealtimeConnection => {
  let socket: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let helloTimer: ReturnType<typeof setTimeout> | null = null
  let attempt = 0
  let ticketRetries = 0
  let protocolRetries = 0
  let isClosedByUser = false
  let welcomed = false

  const clearTimers = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (helloTimer) {
      clearTimeout(helloTimer)
      helloTimer = null
    }
  }

  const send = (message: ClientMessage) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message))
    }
  }

  const scheduleReconnect = (delayMs: number) => {
    if (isClosedByUser) return
    clearTimers()
    onStatus('reconnecting')
    reconnectTimer = setTimeout(() => {
      void connect()
    }, delayMs)
  }

  const handleCloseCode = (code: number, reason?: string) => {
    clearTimers()
    if (isClosedByUser || code === REALTIME_CLOSE_CODES.normal) {
      onStatus('idle')
      return
    }

    if (code === REALTIME_CLOSE_CODES.sessionRevoked) {
      isClosedByUser = true
      onStatus('idle', reason || 'session_revoked')
      onSessionRevoked('remote')
      return
    }

    if (code === REALTIME_CLOSE_CODES.accountUnavailable) {
      isClosedByUser = true
      onStatus('idle', reason || 'account_unavailable')
      onSessionRevoked('suspended')
      return
    }

    if (
      code === REALTIME_CLOSE_CODES.originRejected ||
      code === REALTIME_CLOSE_CODES.tooManyConnections
    ) {
      isClosedByUser = true
      onStatus('offline', reason || String(code))
      return
    }

    if (code === REALTIME_CLOSE_CODES.protocolError) {
      if (protocolRetries >= 1) {
        isClosedByUser = true
        onStatus('offline', reason || 'protocol_error')
        return
      }
      protocolRetries += 1
      scheduleReconnect(getReconnectDelay(attempt++))
      return
    }

    if (code === REALTIME_CLOSE_CODES.ticketInvalid) {
      if (ticketRetries < TICKET_RETRY_LIMIT) {
        ticketRetries += 1
        scheduleReconnect(0)
        return
      }
      scheduleReconnect(getReconnectDelay(attempt++))
      return
    }

    // 1001, 1006, 1011, 4408 o cierre de red inesperado
    scheduleReconnect(getReconnectDelay(attempt++))
  }

  const connect = async () => {
    if (isClosedByUser) return
    clearTimers()
    welcomed = false
    onStatus('connecting')

    let ticketData: { ticket: string; wsUrl: string }
    try {
      const res = await requestTicket()
      if (isClosedByUser) return
      ticketData = {
        ticket: res.ticket,
        wsUrl: res.wsUrl || fallbackWsUrl,
      }
    } catch (error) {
      if (isClosedByUser) return
      const status = (error as { status?: number } | null)?.status
      if (status === 401 || status === 403) {
        onStatus('idle', 'unauthorized')
        return
      }
      scheduleReconnect(getReconnectDelay(attempt++))
      return
    }

    if (!ticketData.wsUrl) {
      onStatus('offline', 'missing_ws_url')
      return
    }

    try {
      socket = createWebSocket(buildWsUrlWithTicket(ticketData.wsUrl, ticketData.ticket))
    } catch {
      scheduleReconnect(getReconnectDelay(attempt++))
      return
    }

    helloTimer = setTimeout(() => {
      if (!welcomed && socket) {
        try {
          socket.close(REALTIME_CLOSE_CODES.protocolError, 'welcome_timeout')
        } catch {
          // noop
        }
      }
    }, HELLO_TIMEOUT_MS)

    socket.onopen = () => {
      // Espera system.welcome antes de pasar a open y enviar hello (sección 16.1)
    }

    socket.onerror = () => {
      // El manejo de reconexión ocurre en onclose
    }

    socket.onmessage = (rawEvent: MessageEvent) => {
      if (typeof rawEvent.data === 'string') {
        try {
          const maybePing = JSON.parse(rawEvent.data) as { type?: string; ts?: number }
          if (maybePing?.type === 'ping') {
            send({ type: 'pong', ts: typeof maybePing.ts === 'number' ? maybePing.ts : Date.now() })
            return
          }
        } catch {
          // continúa hacia parseEnvelope
        }
      }

      const event = parseEnvelope(rawEvent.data)
      if (!event) return

      if (event.type === 'system.welcome') {
        welcomed = true
        if (helloTimer) {
          clearTimeout(helloTimer)
          helloTimer = null
        }
        attempt = 0
        ticketRetries = 0
        protocolRetries = 0

        const lastSeq = getLastSeq()
        onStatus('open')
        send({ type: 'hello', v: 1, lastSeq })
        onStatus(lastSeq !== null ? 'replaying' : 'live')
        onEvent(event)
        return
      }

      if (event.type === 'system.replay_completed') {
        onStatus('live')
        onEvent(event)
        return
      }

      if (event.type === 'system.resync_required') {
        onStatus('resyncing')
        onEvent(event)
        void Promise.resolve(onResyncRequired(event.data.currentSeq)).finally(() => {
          if (!isClosedByUser) onStatus('live')
        })
        return
      }

      onEvent(event)
    }

    socket.onclose = (closeEvent: CloseEvent) => {
      handleCloseCode(closeEvent.code || 1006, closeEvent.reason)
    }
  }

  void connect()

  return {
    close: () => {
      isClosedByUser = true
      clearTimers()
      if (socket) {
        const current = socket
        socket = null
        if (current.readyState === WebSocket.CONNECTING) {
          current.onclose = null
          current.onopen = () => {
            try {
              current.close(REALTIME_CLOSE_CODES.normal, 'client_closed')
            } catch {
              // noop
            }
          }
        } else {
          try {
            current.close(REALTIME_CLOSE_CODES.normal, 'client_closed')
          } catch {
            // noop
          }
        }
      }
      onStatus('idle')
    },
    send,
  }
}
