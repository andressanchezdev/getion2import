// inventory.realtime · manejadores en tiempo real de inventario: stock.changed (filas de stock y detalle), entity.status_changed (producto) y count.* (conteos físicos)
// conecta con: inventory.slice y realtimeRegistry
import type { RealtimeHandlers } from '@/features/realtime'
import { countEventReceived, productPricesFromEvent, productStatusFromEvent, stockRowsChanged } from '../slices/inventory.slice'

export const inventoryRealtimeHandlers: RealtimeHandlers = {
  'stock.changed': [(event, { dispatch }) => void dispatch(stockRowsChanged(event.data.rows))],
  'entity.status_changed': [
    (event, { dispatch }) => {
      const { entity, to } = event.data
      if (entity.kind !== 'product') return
      dispatch(productStatusFromEvent({ id: entity.id, status: to === 'active' ? 'active' : 'inactive', version: entity.version }))
    },
  ],
  'product.prices_changed': [(event, { dispatch }) => void dispatch(productPricesFromEvent({ productId: event.data.productId, prices: event.data.prices }))],
  'count.created': [
    (event, { dispatch }) => {
      const { count } = event.data
      dispatch(
        countEventReceived({
          kind: 'created',
          count: {
            id: count.id,
            companyId: event.companyId ?? 0,
            warehouseId: count.warehouseId,
            warehouseName: count.warehouseName ?? '',
            employeeId: event.actor.type === 'employee' ? event.actor.id : null,
            employeeName: event.actor.name,
            status: count.status,
            createdAt: event.occurredAt,
          },
        })
      )
    },
  ],
  'count.progress_changed': [
    (event, { dispatch }) => {
      const items = event.data.items.flatMap((item) => (item.stockId === undefined ? [] : [{ stockId: item.stockId, countedQty: item.countedQty }]))
      dispatch(countEventReceived({ kind: 'progress', countId: event.data.entity.id, items, by: event.actor.name }))
    },
  ],
  'count.status_changed': [
    (event, { dispatch }) => {
      dispatch(countEventReceived({ kind: 'status', countId: event.data.entity.id, to: event.data.to, at: event.occurredAt }))
    },
  ],
}

