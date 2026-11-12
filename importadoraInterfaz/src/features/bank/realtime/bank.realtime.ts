// bank.realtime · manejadores en tiempo real de la conciliación: bank_record.status_changed, bank_statement.imported, payment.created y payment.status_changed
// conecta con: bank.slice, bank.thunks y realtimeRegistry
// ojo: un extracto importado trae muchas filas que no viajan en el evento: la tabla se recarga una vez, y solo si ya estaba cargada
import type { RealtimeHandlers } from '@/features/realtime'
import { toPendingPayment } from '../helpers/bank.adapter'
import { bankRecordStatusFromEvent, pendingPaymentAddedFromEvent, pendingPaymentRemovedFromEvent } from '../slices/bank.slice'
import { loadBankRecordsThunk, loadPendingPaymentsThunk } from '../thunks/bank.thunks'
import type { BankRecordStatus, BankState, PendingPaymentDto } from '../types/bank.types'

const bankOf = (state: unknown): BankState | undefined => (state as { bank?: BankState }).bank

export const bankRealtimeHandlers: RealtimeHandlers = {
  'bank_record.status_changed': [
    (event, { dispatch }) => {
      const { entity, to, paymentId } = event.data
      dispatch(bankRecordStatusFromEvent({ id: entity.id, to: to as BankRecordStatus, by: event.actor.name, at: event.occurredAt, paymentId }))
    },
  ],
  'bank_statement.imported': [
    (_event, { dispatch, getState }) => {
      if (bankOf(getState())?.list.status === 'succeeded') void dispatch(loadBankRecordsThunk() as never)
    },
  ],
  'payment.created': [
    (event, { dispatch }) => {
      const payment = event.data.payment as unknown as PendingPaymentDto & { method?: string; status?: string }
      if (payment.method === 'transfer' && payment.status === 'review') dispatch(pendingPaymentAddedFromEvent(toPendingPayment(payment)))
    },
  ],
  'payment.status_changed': [
    (event, { dispatch, getState }) => {
      const { entity, to } = event.data
      if (to !== 'review') dispatch(pendingPaymentRemovedFromEvent(entity.id))
      // un pago devuelto a revisión no trae su fila en el evento: se relee la lista corta, solo si estaba cargada
      else if (bankOf(getState())?.pendingPayments.status === 'succeeded') void dispatch(loadPendingPaymentsThunk() as never)
    },
  ],
}
