// wallet.payments.thunks · cambios de cartera: abonar, verificar transferencia, anular pago, ajustes y cupo/plazo
// conecta con: wallet.payments.service, wallet.service (releer facturas), wallet.thunks (recargar lista y totales) y wallet.slice (reacciona)
// ojo: después de cambiar algo se vuelven a leer facturas, lista y totales (el backend calcula los saldos, no se suman a mano)
import { isRealtimeLive } from '@/features/realtime/helpers/realtime.guards'
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
import { formatCOP } from '@/global/helpers/formatting/format'
import { toast } from '@/global/helpers/feedback/toast'
import { selectRequestContext } from '@/features/auth'
import { splitPayment } from '../helpers/wallet.helpers'
import { fetchCustomerInvoices } from '../services/wallet.service'
import { registerPayment, updateCredit, verifyPayment, voidPayment, rejectPayment, reopenPayment } from '../services/wallet.payments.service'
import { loadPaymentsHistoryThunk } from './wallet.history.thunks'
import { loadWalletSummaryThunk, loadWalletThunk, NO_SESSION, type WalletThunkConfig } from './wallet.thunks'
import type { CreditUpdateInput, PaymentDetails, PaymentInput } from '../types/wallet.api.types'
import type { CreditInvoice } from '../types/wallet.types'

const noOtherChangeRunning = (_: unknown, { getState }: { getState: () => { wallet: { invoices: { saving: boolean } } } }) =>
  !getState().wallet.invoices.saving

// avisa el error al usuario y lo devuelve como rechazo del thunk
// con el socket en vivo el historial y los totales se actualizan por evento (wallet.realtime); sin socket se recargan aquí
const refreshIfOffline = (dispatch: (action: never) => unknown, getState: () => unknown): void => {
  if (isRealtimeLive(getState())) return
  void dispatch(loadPaymentsHistoryThunk() as never)
  void dispatch(loadWalletSummaryThunk() as never)
}

const failWith = (error: unknown, fallback: string) => {
  const message = getErrorMessage(error, fallback)
  toast.error(message)
  return message
}

export interface PayInput {
  customerId: number
  amount: number
  saleId?: number // con saleId se abona a esa factura; sin él se reparte entre las más antiguas
  details?: PaymentDetails // cómo se recibió (por defecto efectivo)
}

export const payThunk = createAsyncThunk<CreditInvoice[], PayInput, WalletThunkConfig>(
  'wallet/pay',
  async ({ customerId, amount, saleId, details }, { getState, dispatch, rejectWithValue }) => {
    const state = getState()
    const ctx = selectRequestContext(state)
    if (!ctx) return rejectWithValue(NO_SESSION)

    const invoices = state.wallet.invoices.items
    const payments: PaymentInput[] =
      saleId === undefined
        ? splitPayment(invoices, amount)
        : splitPayment(invoices.filter((invoice) => invoice.saleId === saleId), amount)
    if (payments.length === 0) return rejectWithValue(failWith(null, 'No hay saldo pendiente para abonar.'))

    // los abonos van de uno en uno: si uno falla se avisa, pero lo ya abonado se refleja al releer
    let failure: string | null = null
    for (const payment of payments) {
      try {
        await registerPayment(ctx, customerId, payment, details)
      } catch (error) {
        failure = failWith(error, 'No se pudo registrar el abono.')
        break
      }
    }

    try {
      // en vivo, sale.payment_changed y credit.balance_changed ya dejaron al día facturas, cliente y totales; sin socket se relee todo
      const live = isRealtimeLive(getState())
      const refreshed = live ? getState().wallet.invoices.items : await fetchCustomerInvoices(ctx, customerId)
      if (!live) {
        dispatch(loadWalletThunk())
        dispatch(loadWalletSummaryThunk())
      }
      if (failure) return rejectWithValue(failure)
      toast.success(`¡Abono de ${formatCOP(payments.reduce((sum, p) => sum + p.amount, 0))} registrado!`)
      return refreshed
    } catch (error) {
      return rejectWithValue(failure ?? failWith(error, 'No se pudieron releer las facturas.'))
    }
  },
  { condition: noOtherChangeRunning }
)

export const updateCreditThunk = createAsyncThunk<void, CreditUpdateInput, WalletThunkConfig>(
  'wallet/updateCredit',
  async (input, { dispatch, rejectWithValue }) => {
    try {
      await updateCredit(input)
      await Promise.all([dispatch(loadWalletThunk()), dispatch(loadWalletSummaryThunk())])
      toast.success('Cupo y plazo actualizados')
    } catch (error) {
      return rejectWithValue(failWith(error, 'No se pudo actualizar el cupo.'))
    }
  },
  { condition: noOtherChangeRunning }
)

// verifica / aprueba formalmente un pago en revisión (POST /payments/:id/verify)
export const verifyPaymentThunk = createAsyncThunk<void, { paymentId: number }, WalletThunkConfig>(
  'wallet/verifyPayment',
  async ({ paymentId }, { dispatch, getState, rejectWithValue }) => {
    try {
      await verifyPayment(paymentId)
      toast.success('Pago verificado y aprobado exitosamente')
      refreshIfOffline(dispatch, getState)
    } catch (error) {
      return rejectWithValue(failWith(error, 'No se pudo verificar el pago.'))
    }
  }
)

// anula un pago con motivo explícito (POST /payments/:id/void)
export const voidPaymentThunk = createAsyncThunk<void, { paymentId: number; reason: string }, WalletThunkConfig>(
  'wallet/voidPayment',
  async ({ paymentId, reason }, { dispatch, getState, rejectWithValue }) => {
    try {
      await voidPayment(paymentId, reason)
      toast.success('Pago anulado exitosamente')
      refreshIfOffline(dispatch, getState)
    } catch (error) {
      return rejectWithValue(failWith(error, 'No se pudo anular el pago.'))
    }
  }
)

// rechaza un pago en revisión con motivo (POST /payments/:id/reject)
export const rejectPaymentThunk = createAsyncThunk<void, { paymentId: number; reason: string }, WalletThunkConfig>(
  'wallet/rejectPayment',
  async ({ paymentId, reason }, { dispatch, getState, rejectWithValue }) => {
    try {
      await rejectPayment(paymentId, reason)
      toast.success('Pago rechazado')
      refreshIfOffline(dispatch, getState)
    } catch (error) {
      return rejectWithValue(failWith(error, 'No se pudo rechazar el pago.'))
    }
  }
)

// devuelve un pago rechazado a revisión (POST /payments/:id/reopen)
export const reopenPaymentThunk = createAsyncThunk<void, { paymentId: number }, WalletThunkConfig>(
  'wallet/reopenPayment',
  async ({ paymentId }, { dispatch, getState, rejectWithValue }) => {
    try {
      await reopenPayment(paymentId)
      toast.success('Pago devuelto a revisión')
      refreshIfOffline(dispatch, getState)
    } catch (error) {
      return rejectWithValue(failWith(error, 'No se pudo devolver el pago a revisión.'))
    }
  }
)
