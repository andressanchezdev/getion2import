// realtime.router · registro tipo → manejadores y ejecución en orden; un manejador que falla no detiene a los demás
// conecta con: app/store/realtimeRegistry.ts y realtime.thunks
import type { AppDispatch, RootState } from '@/app/store/store'
import type { RealtimeEnvelope, RealtimeEvent, RealtimeEventType } from '../types/realtime.contract'

export interface RealtimeHandlerApi {
  dispatch: AppDispatch
  getState: () => RootState
}

export type RealtimeHandler<T extends RealtimeEventType = RealtimeEventType> = (
  event: RealtimeEnvelope<T>,
  api: RealtimeHandlerApi
) => void

export type RealtimeHandlers = Partial<{
  [K in RealtimeEventType]: Array<RealtimeHandler<K>>
}>

const handlers = new Map<RealtimeEventType, Array<RealtimeHandler<RealtimeEventType>>>()

export const registerRealtimeHandlers = (map: RealtimeHandlers): (() => void) => {
  const entries = Object.entries(map) as Array<
    [RealtimeEventType, Array<RealtimeHandler<RealtimeEventType>> | undefined]
  >

  for (const [type, list] of entries) {
    if (!list || list.length === 0) continue
    const current = handlers.get(type) ?? []
    handlers.set(type, [...current, ...list])
  }

  return () => {
    for (const [type, list] of entries) {
      if (!list || list.length === 0) continue
      const current = handlers.get(type) ?? []
      handlers.set(
        type,
        current.filter((item) => !list.includes(item))
      )
    }
  }
}

export const clearRealtimeHandlers = (): void => {
  handlers.clear()
}

export const routeRealtimeEvent = (event: RealtimeEvent, api: RealtimeHandlerApi): void => {
  const list = handlers.get(event.type)
  if (!list || list.length === 0) return

  for (const handler of list) {
    try {
      handler(event as RealtimeEnvelope<typeof event.type>, api)
    } catch (error) {
      if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
        console.error('[realtime]', event.type, error)
      }
    }
  }
}

