// billing.realtime · manejadores en tiempo real de facturación: sale.created e invoice.issued avanzan el consecutivo que se ve en pantalla
// conecta con: billing.slice y realtimeRegistry
import type { RealtimeHandlers } from '@/features/realtime'
import { docSeriesUsedFromEvent } from '../slices/billing.slice'

export const billingRealtimeHandlers: RealtimeHandlers = {
  'sale.created': [
    (event, { dispatch }) => {
      const serial = (event.data.sale as { serial?: string } | null)?.serial
      if (serial) dispatch(docSeriesUsedFromEvent({ docType: 'sale', warehouseIds: event.warehouseIds, serial }))
    },
  ],
  'invoice.issued': [
    (event, { dispatch }) => {
      dispatch(docSeriesUsedFromEvent({ docType: 'invoice', warehouseIds: event.warehouseIds, serial: event.data.invoice.serial }))
    },
  ],
}
