// realtime.constants · tipos de evento conocidos y tiempos de reconexión
// conecta con: realtime.handlers (qué hacer con cada evento) y realtime.backoff (esperas)
// ojo: CONTRATO PROVISIONAL. El Swagger del backend no documenta el websocket ni sus eventos; cuando se conozcan los reales,
// solo hay que cambiar los nombres aquí y la forma del mensaje en helpers/realtime.adapter.ts
export const REALTIME_EVENT_TYPES = {
  stockUpdated: 'stock.updated', // body: { productId, warehouseId, stock }
} as const

export const RECONNECT_BASE_MS = 1000 // primera espera al reconectar
export const RECONNECT_MAX_MS = 30000 // la espera crece al doble en cada intento hasta este tope
