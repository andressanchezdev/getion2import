// wallet.payments.service · llamadas al backend que cambian cartera: POST /payments/register (abono a una factura) y PUT /users/credit (cupo y plazo de un cliente)
// conecta con: api/client y api/config; las usa wallet.payments.thunks
// ojo: el cuerpo del abono es el mismo que usa importadora-online (JSON sin imagen): userId es el cliente que paga y userVerifyId el usuario de la sesión; con efectivo no se pide comprobante
import { apiClient, API_CONFIG } from '@/api'
import type { RequestContext } from '@/features/auth'
import { WALLET_PAYMENT_METHOD } from '../constants/wallet.constants'
import type { CreditUpdateInput, PaymentInput } from '../types/wallet.api.types'

export const registerPayment = async (
  ctx: RequestContext,
  customerId: number,
  payment: PaymentInput,
  warehouseId?: number
): Promise<void> => {
  await apiClient.post(API_CONFIG.ENDPOINTS.PAYMENTS.REGISTER, {
    companyId: ctx.companyId,
    userId: customerId,
    userVerifyId: ctx.userId,
    paymentMethod: WALLET_PAYMENT_METHOD,
    reference: '',
    saleId: payment.saleId,
    amount: payment.amount,
    remainingAmount: payment.remainingAmount,
    warehouseId: warehouseId ?? ctx.warehouseId,
  })
}


export const updateCredit = async (input: CreditUpdateInput): Promise<void> => {
  await apiClient.put(API_CONFIG.ENDPOINTS.USERS.CREDIT, {
    userId: input.customerId,
    quota: input.quota,
    days: input.days,
    isCredit: input.isCredit,
  })
}
