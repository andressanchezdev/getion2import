// realtime.guards · guardas de tipo por evento para usar dentro de los manejadores *.realtime.ts
// conecta con: realtime.contract y los manejadores de cada feature
import type {
  EntityKind,
  EntityStatusChangedData,
  RealtimeEnvelope,
  RealtimeEvent,
  RealtimeEventType,
  StockChangedData,
  TransferCreatedData,
  TransferStatusChangedData,
} from '../types/realtime.contract'

export const isEvent = <T extends RealtimeEventType>(
  event: RealtimeEvent,
  type: T
): event is Extract<RealtimeEvent, { type: T }> => event.type === type

export const isStockChangedEvent = (
  event: RealtimeEvent
): event is RealtimeEnvelope<'stock.changed'> => {
  if (event.type !== 'stock.changed') return false
  const data = event.data as Partial<StockChangedData>
  return Array.isArray(data?.rows) && Array.isArray(data?.totals) && typeof data?.cause?.type === 'string'
}

export const isTransferCreatedEvent = (
  event: RealtimeEvent
): event is RealtimeEnvelope<'transfer.created'> => {
  if (event.type !== 'transfer.created') return false
  const data = event.data as Partial<TransferCreatedData>
  return typeof data?.transfer?.id === 'number'
}

export const isTransferStatusChangedEvent = (
  event: RealtimeEvent
): event is RealtimeEnvelope<'transfer.status_changed'> => {
  if (event.type !== 'transfer.status_changed') return false
  const data = event.data as Partial<TransferStatusChangedData>
  return typeof data?.entity?.id === 'number' && typeof data?.to === 'string'
}

export const isEntityStatusChangedOfKind = <K extends EntityKind>(
  event: RealtimeEvent,
  kind: K
): event is RealtimeEnvelope<'entity.status_changed'> & { data: EntityStatusChangedData & { entity: { kind: K } } } => {
  if (event.type !== 'entity.status_changed') return false
  return event.data?.entity?.kind === kind && typeof event.data?.entity?.id === 'number'
}

// isRealtimeLive · true si el socket está en vivo: los thunks de mutación solo recargan por HTTP cuando esto es false (respaldo)
export const isRealtimeLive = (state: unknown): boolean => (state as { realtime?: { status?: string } } | null)?.realtime?.status === 'live'
