// realtime.handlers · registro de qué hacer con cada tipo de evento (evento → acción de una feature)
// conecta con: realtime.thunks (lo llama por cada evento) y features/shop (applyStockUpdate); para un evento nuevo se agrega una línea
// ojo: los webhooks del backend llegan al cliente como eventos; cada uno es una entrada aquí, sin tocar el servicio de conexión
import type { UnknownAction } from '@reduxjs/toolkit'
import { applyStockUpdate, type StockUpdate } from '@/features/shop'
import { REALTIME_EVENT_TYPES } from '../constants/realtime.constants'
import type { RealtimeEvent } from '../types/realtime.types'

type RealtimeDispatch = (action: UnknownAction) => unknown

// el cuerpo del evento de stock debe traer producto, bodega y stock numérico
const isStockUpdate = (body: unknown): body is StockUpdate => {
  const data = body as Partial<StockUpdate> | null
  return (
    typeof data?.productId === 'string' && typeof data.warehouseId === 'string' && typeof data.stock === 'number'
  )
}

const EVENT_HANDLERS: Record<string, (body: unknown, dispatch: RealtimeDispatch) => void> = {
  [REALTIME_EVENT_TYPES.stockUpdated]: (body, dispatch) => {
    if (isStockUpdate(body)) dispatch(applyStockUpdate(body))
  },
}

// ejecuta el manejador del evento; los tipos desconocidos se ignoran
export const handleRealtimeEvent = (event: RealtimeEvent, dispatch: RealtimeDispatch): void => {
  EVENT_HANDLERS[event.type]?.(event.body, dispatch)
}
