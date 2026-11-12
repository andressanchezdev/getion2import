// quotations.realtime · manejadores en tiempo real de cotizaciones: quotation.created, quotation.updated y quotation.status_changed
// conecta con: quotations.slice, quotations.thunks y realtimeRegistry
// ojo: la fila de la tabla lleva el WhatsApp del cliente, que no viaja en el evento: una cotización nueva recarga la lista una vez, y solo si ya estaba cargada
import type { RealtimeHandlers } from '@/features/realtime'
import { quotationStatusFromEvent, quotationUpdatedFromEvent } from '../slices/quotations.slice'
import { loadQuotationsThunk } from '../thunks/quotations.thunks'
import type { QuotationsState, QuotationStatus } from '../types/quotations.types'

export const quotationsRealtimeHandlers: RealtimeHandlers = {
  'quotation.created': [
    (_event, { dispatch, getState }) => {
      if ((getState() as { quotations?: QuotationsState }).quotations?.list.status === 'succeeded') void dispatch(loadQuotationsThunk() as never)
    },
  ],
  'quotation.updated': [
    (event, { dispatch }) => {
      const notes = (event.data.row as { notes?: string | null }).notes
      dispatch(quotationUpdatedFromEvent({ id: event.data.entity.id, notes: notes ?? '' }))
    },
  ],
  'quotation.status_changed': [
    (event, { dispatch }) => {
      dispatch(quotationStatusFromEvent({ id: event.data.entity.id, to: event.data.to as QuotationStatus }))
    },
  ],
}
