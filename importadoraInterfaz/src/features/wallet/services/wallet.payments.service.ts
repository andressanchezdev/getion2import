// wallet.payments.service · llamadas al backend que cambian cartera: abonar a una venta a crédito (POST /payments y luego su verificación) y el cupo y plazo de un cliente (PUT /customers/:id)
// conecta con: api/client y api/config; las usa wallet.payments.thunks
// ojo: en la API en Go un pago nace EN REVISIÓN y solo baja la deuda cuando se verifica; como el abono en efectivo lo recibe quien lo registra, aquí se crea y se verifica en seguida
// ojo: si falla la verificación (por ejemplo, sin permiso de verificar) el abono queda en revisión y se avisa con el mensaje del servidor
import { apiClient, API_CONFIG, createAppError, type APIResponse } from '@/api'
import type { RequestContext } from '@/features/auth'
import { WALLET_PAYMENT_METHOD } from '../constants/wallet.constants'
import type { CreditUpdateInput, PaymentDetails, PaymentInput } from '../types/wallet.api.types'

const { PAYMENTS, CUSTOMERS } = API_CONFIG.ENDPOINTS

// el contexto y el cliente no viajan: la venta ya los define y el empleado sale del token; se conservan en la firma para que los thunks no cambien
// ojo: el efectivo se verifica en seguida; la transferencia queda EN REVISIÓN hasta que cartera la concilie con el extracto del banco
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

// cambia el cupo, el plazo y si el cliente tiene crédito
export const updateCredit = async (input: CreditUpdateInput): Promise<void> => {
  await apiClient.put(CUSTOMERS.BY_ID(input.customerId), {
    creditEnabled: input.isCredit,
    creditLimit: input.quota,
    creditDays: input.days,
  })
}
