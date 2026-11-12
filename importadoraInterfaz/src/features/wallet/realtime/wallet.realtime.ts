// wallet.realtime · manejadores en tiempo real de cartera: payment.created, payment.status_changed, credit.balance_changed y sale.payment_changed
// conecta con: wallet.slice, wallet.thunks (totales) y realtimeRegistry
// ojo: las tarjetas de totales son sumas de toda la cartera y no se pueden deducir del evento: se recalculan una sola vez (con espera) y solo si ya estaban cargadas
import type { RealtimeHandlers } from '@/features/realtime'
import { toAbonoRecord } from '../helpers/wallet.adapter'
import { creditBalanceFromEvent, invoicePaymentFromEvent, paymentCreatedFromEvent, paymentStatusFromEvent } from '../slices/wallet.slice'
import { loadWalletSummaryThunk } from '../thunks/wallet.thunks'
import type { PaymentHistoryDto } from '../types/wallet.api.types'
import type { AbonoRecord, WalletState } from '../types/wallet.types'

export const SUMMARY_DELAY_MS = 500
let summaryTimer: ReturnType<typeof setTimeout> | null = null

type Ctx = { dispatch: (action: never) => unknown; getState: () => unknown }

// varios eventos seguidos (un abono repartido en 3 facturas) piden los totales una sola vez
const refreshSummarySoon = ({ dispatch, getState }: Ctx): void => {
  if ((getState() as { wallet?: WalletState }).wallet?.summary.status !== 'succeeded') return
  if (summaryTimer) clearTimeout(summaryTimer)
  summaryTimer = setTimeout(() => {
    summaryTimer = null
    void dispatch(loadWalletSummaryThunk() as never)
  }, SUMMARY_DELAY_MS)
}

const ABONO_STATUS: Record<string, AbonoRecord['status']> = { review: 'pending', verified: 'verified', issue: 'rejected', voided: 'void' }

export const walletRealtimeHandlers: RealtimeHandlers = {
  'payment.created': [
    (event, ctx) => {
      ctx.dispatch(paymentCreatedFromEvent(toAbonoRecord(event.data.payment as PaymentHistoryDto, 0)))
      refreshSummarySoon(ctx as Ctx)
    },
  ],
  'payment.status_changed': [
    (event, ctx) => {
      const { entity, to, reason } = event.data
      ctx.dispatch(
        paymentStatusFromEvent({
          id: entity.id,
          status: ABONO_STATUS[to] ?? 'verified',
          verifiedByName: to === 'verified' ? event.actor.name : undefined,
          note: reason ?? undefined,
        })
      )
      refreshSummarySoon(ctx as Ctx)
    },
  ],
  'credit.balance_changed': [
    (event, ctx) => {
      const { customerId, creditLimit, available } = event.data
      ctx.dispatch(creditBalanceFromEvent({ customerId, creditLimit, available }))
      refreshSummarySoon(ctx as Ctx)
    },
  ],
  'sale.payment_changed': [
    (event, { dispatch }) => {
      dispatch(invoicePaymentFromEvent({ saleId: event.data.saleId, paidTotal: event.data.paidTotal }))
    },
  ],
}
