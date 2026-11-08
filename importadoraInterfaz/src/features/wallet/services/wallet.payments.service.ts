// wallet.payments.service · llamadas al backend que cambian cartera: abonar, verificar transferencia, anular, rechazar y reabrir pagos y crédito
// conecta con: api/client y api/config (PAYMENTS, CUSTOMERS); las usa wallet.payments.thunks
// ojo: en la API en Go un pago nace EN REVISIÓN y solo baja la deuda cuando se verifica
import { apiClient, API_CONFIG, createAppError, type APIResponse } from '@/api'
import type { RequestContext } from '@/features/auth'
import { WALLET_PAYMENT_METHOD } from '../constants/wallet.constants'
import type { CreditUpdateInput, PaymentDetails, PaymentInput } from '../types/wallet.api.types'

const { PAYMENTS, CUSTOMERS } = API_CONFIG.ENDPOINTS

// registra un abono a una venta
export const registerPayment = async (_ctx: RequestContext, _customerId: number, payment: PaymentInput, details: PaymentDetails = { method: WALLET_PAYMENT_METHOD }): Promise<void> => {
  const { data } = await apiClient.post<APIResponse<{ id: number }>>(PAYMENTS.LIST, {
    saleId: payment.saleId,
    method: details.method,
    amount: payment.amount,
    ...(details.reference ? { reference: details.reference } : {}),
    ...(details.proofUrl ? { proofUrl: details.proofUrl } : {}),
  })
  const paymentId = data.data?.id
  if (!paymentId) throw createAppError('El abono se registró pero no se pudo verificar.')
  if (details.method === 'cash') await apiClient.post(PAYMENTS.VERIFY(paymentId), {})
}

// verifica / aprueba formalmente un pago en revisión (POST /payments/:id/verify)
export const verifyPayment = async (paymentId: number): Promise<void> => {
  await apiClient.post(PAYMENTS.VERIFY(paymentId), {})
}

// anula un pago con motivo explícito (POST /payments/:id/void)
export const voidPayment = async (paymentId: number, voidReason: string): Promise<void> => {
  await apiClient.post(PAYMENTS.VOID(paymentId), { voidReason })
}

// rechaza un pago en revisión con su motivo de 10 a 100 caracteres (POST /payments/:id/reject)
export const rejectPayment = async (paymentId: number, reason: string): Promise<void> => {
  await apiClient.post(PAYMENTS.REJECT(paymentId), { reason })
}

// devuelve un pago rechazado a «en revisión» (POST /payments/:id/reopen)
export const reopenPayment = async (paymentId: number): Promise<void> => {
  await apiClient.post(PAYMENTS.REOPEN(paymentId), {})
}

// cambia el cupo, el plazo y si el cliente tiene crédito
export const updateCredit = async (input: CreditUpdateInput): Promise<void> => {
  await apiClient.put(CUSTOMERS.BY_ID(input.customerId), {
    creditEnabled: input.isCredit,
    creditLimit: input.quota,
    creditDays: input.days,
  })
}
