// wallet.payments.thunks · cambios de cartera: abonar a una factura (o repartir un abono entre las más antiguas) y cambiar el cupo y el plazo de un cliente
// conecta con: wallet.payments.service (POST /payments/register y PUT /users/credit), wallet.service (releer facturas), wallet.thunks (recargar lista y totales) y wallet.slice (reacciona)
// ojo: después de cambiar algo se vuelven a leer facturas, lista y totales (el backend calcula los saldos, no se suman a mano); los errores se avisan con una alerta; un solo cambio a la vez (condition)
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
import { formatCOP } from '@/global/helpers/format'
import { toast } from '@/global/helpers/toast'
import { toWarehouseNumber } from '@/global/helpers/warehouse'
import { selectRequestContext } from '@/features/auth'
import { splitPayment } from '../helpers/wallet.helpers'
import { fetchCustomerInvoices } from '../services/wallet.service'
import { registerPayment, updateCredit } from '../services/wallet.payments.service'
import { loadWalletSummaryThunk, loadWalletThunk, NO_SESSION, type WalletThunkConfig } from './wallet.thunks'
import type { CreditUpdateInput, PaymentInput } from '../types/wallet.api.types'
import type { CreditInvoice } from '../types/wallet.types'

const noOtherChangeRunning = (_: unknown, { getState }: { getState: () => { wallet: { invoices: { saving: boolean } } } }) =>
  !getState().wallet.invoices.saving

// avisa el error al usuario y lo devuelve como rechazo del thunk
const failWith = (error: unknown, fallback: string) => {
  const message = getErrorMessage(error, fallback)
  toast.error(message)
  return message
}

export interface PayInput {
  customerId: number
  amount: number
  saleId?: number // con saleId se abona a esa factura; sin él se reparte entre las más antiguas
}

export const payThunk = createAsyncThunk<CreditInvoice[], PayInput, WalletThunkConfig>(
  'wallet/pay',
  async ({ customerId, amount, saleId }, { getState, dispatch, rejectWithValue }) => {
    const state = getState()
    const ctx = selectRequestContext(state)
    if (!ctx) return rejectWithValue(NO_SESSION)
    const warehouseId = toWarehouseNumber(state.ui.activeWarehouseId)

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
        await registerPayment(ctx, customerId, payment, warehouseId)
      } catch (error) {
        failure = failWith(error, 'No se pudo registrar el abono.')
        break
      }
    }

    try {
      const refreshed = await fetchCustomerInvoices(ctx, customerId, warehouseId)
      dispatch(loadWalletThunk())
      dispatch(loadWalletSummaryThunk())
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
