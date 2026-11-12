// realtime.service.test · verifica máquina de estados 16.1 con WebSocket simulado (4001, 4401, 4003 y 1006)
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRealtimeConnection } from './realtime.service'
import { REALTIME_CLOSE_CODES } from '../constants/realtime.constants'
import type { RealtimeStatus } from '../types/realtime.types'

class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  url: string
  readyState = MockWebSocket.OPEN
  onopen: (() => void) | null = null
  onmessage: ((ev: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  onclose: ((ev: CloseEvent) => void) | null = null
  sent: string[] = []

  constructor(url: string) {
    this.url = url
  }

  send(data: string) {
    this.sent.push(data)
  }

  close(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.({ code, reason } as CloseEvent)
  }
}

describe('realtime.service · createRealtimeConnection', () => {
  let sockets: MockWebSocket[] = []

  beforeEach(() => {
    vi.useFakeTimers()
    sockets = []
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('ante 4001 pide ticket nuevo hasta 3 veces seguidas y luego aplica espera creciente', async () => {
    let ticketCounter = 0
    const requestTicket = vi.fn(async () => ({
      ticket: `tk-${++ticketCounter}`,
      wsUrl: 'ws://localhost:3002/ws',
      expiresAt: '2026-11-12T15:00:30Z',
    }))

    const conn = createRealtimeConnection({
      getLastSeq: () => null,
      requestTicket,
      createWebSocket: (url) => {
        const ws = new MockWebSocket(url)
        sockets.push(ws)
        return ws as unknown as WebSocket
      },
      onStatus: () => {},
      onEvent: () => {},
      onSessionRevoked: () => {},
      onResyncRequired: () => {},
    })

    await vi.advanceTimersByTimeAsync(0)
    expect(requestTicket).toHaveBeenCalledTimes(1)
    expect(sockets).toHaveLength(1)

    // 3 cierres 4001 seguidos → reintento inmediato (delay 0)
    for (let i = 1; i <= 3; i++) {
      sockets[sockets.length - 1].close(REALTIME_CLOSE_CODES.ticketInvalid, 'ticket_invalid')
      await vi.advanceTimersByTimeAsync(0)
      expect(requestTicket).toHaveBeenCalledTimes(1 + i)
    }

    // 4to cierre 4001 → espera creciente (1000 ms)
    sockets[sockets.length - 1].close(REALTIME_CLOSE_CODES.ticketInvalid, 'ticket_invalid')
    await vi.advanceTimersByTimeAsync(500)
    expect(requestTicket).toHaveBeenCalledTimes(4)

    await vi.advanceTimersByTimeAsync(500)
    expect(requestTicket).toHaveBeenCalledTimes(5)

    conn.close()
  })

  it('ante 4401 despacha el cierre de sesión y no reconecta', async () => {
    const onSessionRevoked = vi.fn()
    const requestTicket = vi.fn(async () => ({
      ticket: 'tk-1',
      wsUrl: 'ws://localhost:3002/ws',
      expiresAt: '2026-11-12T15:00:30Z',
    }))

    createRealtimeConnection({
      getLastSeq: () => null,
      requestTicket,
      createWebSocket: (url) => {
        const ws = new MockWebSocket(url)
        sockets.push(ws)
        return ws as unknown as WebSocket
      },
      onStatus: () => {},
      onEvent: () => {},
      onSessionRevoked,
      onResyncRequired: () => {},
    })

    await vi.advanceTimersByTimeAsync(0)
    sockets[0].close(REALTIME_CLOSE_CODES.sessionRevoked, 'session_revoked')

    expect(onSessionRevoked).toHaveBeenCalledWith('remote')
    await vi.advanceTimersByTimeAsync(5000)
    expect(requestTicket).toHaveBeenCalledTimes(1)
  })

  it('ante 4003 pasa a offline sin reintentar', async () => {
    const statuses: RealtimeStatus[] = []
    const requestTicket = vi.fn(async () => ({
      ticket: 'tk-1',
      wsUrl: 'ws://localhost:3002/ws',
      expiresAt: '2026-11-12T15:00:30Z',
    }))

    createRealtimeConnection({
      getLastSeq: () => null,
      requestTicket,
      createWebSocket: (url) => {
        const ws = new MockWebSocket(url)
        sockets.push(ws)
        return ws as unknown as WebSocket
      },
      onStatus: (s) => statuses.push(s),
      onEvent: () => {},
      onSessionRevoked: () => {},
      onResyncRequired: () => {},
    })

    await vi.advanceTimersByTimeAsync(0)
    sockets[0].close(REALTIME_CLOSE_CODES.originRejected, 'origin_rejected')

    expect(statuses[statuses.length - 1]).toBe('offline')
    await vi.advanceTimersByTimeAsync(10000)
    expect(requestTicket).toHaveBeenCalledTimes(1)
  })

  it('ante 1006 reconecta con espera creciente (1 s, 2 s…)', async () => {
    const requestTicket = vi.fn(async () => ({
      ticket: 'tk-1',
      wsUrl: 'ws://localhost:3002/ws',
      expiresAt: '2026-11-12T15:00:30Z',
    }))

    const conn = createRealtimeConnection({
      getLastSeq: () => null,
      requestTicket,
      createWebSocket: (url) => {
        const ws = new MockWebSocket(url)
        sockets.push(ws)
        return ws as unknown as WebSocket
      },
      onStatus: () => {},
      onEvent: () => {},
      onSessionRevoked: () => {},
      onResyncRequired: () => {},
    })

    await vi.advanceTimersByTimeAsync(0)
    expect(requestTicket).toHaveBeenCalledTimes(1)

    // Primer 1006 → espera 1000 ms
    sockets[0].close(1006, 'abnormal')
    await vi.advanceTimersByTimeAsync(999)
    expect(requestTicket).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(requestTicket).toHaveBeenCalledTimes(2)

    // Segundo 1006 → espera 2000 ms
    sockets[1].close(1006, 'abnormal')
    await vi.advanceTimersByTimeAsync(1999)
    expect(requestTicket).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(requestTicket).toHaveBeenCalledTimes(3)

    conn.close()
  })
})

