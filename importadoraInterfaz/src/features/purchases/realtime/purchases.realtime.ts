// purchases.realtime · manejadores en tiempo real de compras: purchase.created, purchase.status_changed, purchase.payment_recorded y supplier_catalog.imported
// conecta con: purchases.slice y realtimeRegistry
import type { RealtimeHandlers } from '@/features/realtime'
import { toPurchase } from '../helpers/purchases.adapter'
import { purchaseCreatedFromEvent, purchasePaymentFromEvent, purchaseStatusFromEvent, supplierCatalogImportedFromEvent } from '../slices/purchases.slice'
import type { PurchaseDto, PurchaseStatus } from '../types/purchases.types'

export const purchasesRealtimeHandlers: RealtimeHandlers = {
  'purchase.created': [
    (event, { dispatch }) => {
      const dto = event.data.purchase as unknown as PurchaseDto
      if (typeof dto?.id === 'number') dispatch(purchaseCreatedFromEvent(toPurchase(dto)))
    },
  ],
  'purchase.status_changed': [
    (event, { dispatch }) => {
      const { entity, to, lines } = event.data
      dispatch(
        purchaseStatusFromEvent({
          id: entity.id,
          to: to as PurchaseStatus,
          lines: lines.map((line) => ({ productId: line.productId, received: line.received })),
          at: event.occurredAt,
        })
      )
    },
  ],
  'purchase.payment_recorded': [
    (event, { dispatch }) => {
      dispatch(purchasePaymentFromEvent({ purchaseId: event.data.purchaseId, paid: event.data.paid }))
    },
  ],
  'supplier_catalog.imported': [
    (event, { dispatch }) => {
      dispatch(supplierCatalogImportedFromEvent(event.data.supplierId))
    },
  ],
}
