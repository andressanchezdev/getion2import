// shop.sales.service · llamadas a Swagger para creación, facturación y anulación de ventas
// conecta con: apiClient, API_CONFIG (SALES.REGISTER, SALES.CANCEL), RequestContext y shop feature
import { apiClient, API_CONFIG, type APIResponse } from '@/api'
import type { RequestContext } from '@/features/auth'

export interface CreateSaleInput {
  uuid: string
  customerId?: number
  paymentMethod: 'cash' | 'transfer' | 'credit' | string
  totalAmount: number
  invoiceStatus?: 'pendiente' | 'facturar'
  directionId?: number
  address?: string
  saleChannel?: string
}

export interface CancelSaleInput {
  saleId: number
  reason: string
}

const { SALES } = API_CONFIG.ENDPOINTS

export const createSale = async (
  ctx: RequestContext,
  input: CreateSaleInput
): Promise<any> => {
  const { data } = await apiClient.post<APIResponse<any>>(SALES.REGISTER, {
    companyId: ctx.companyId,
    userId: input.customerId ?? ctx.userId,
    sellerId: ctx.userId,
    warehouseId: ctx.warehouseId,
    uuid: input.uuid,
    saleType: 'sale',
    paymentMethod: input.paymentMethod,
    totalAmount: input.totalAmount,
    invoiceStatus: input.invoiceStatus || 'pendiente',
    ...(input.directionId && { directionId: input.directionId }),
    ...(input.address && { address: input.address }),
    ...(input.saleChannel && { saleChannel: input.saleChannel }),
  })
  return data.data
}

export const cancelSale = async (
  ctx: RequestContext,
  input: CancelSaleInput
): Promise<void> => {
  await apiClient.post(SALES.CANCEL, {
    saleId: input.saleId,
    userId: ctx.userId,
    reason: input.reason.trim(),
  })
}
