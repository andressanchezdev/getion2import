// shop.sales.service · llamadas al backend que cierran o anulan una venta: POST /sales/register (desde el carrito) y POST /sales/cancel
// conecta con: api/client y api/config, shop.sales.types; las usan shop.checkout.thunks y los thunks de ventas
// ojo: el backend arma la venta con las líneas del carrito (uuid); no se envía invoiceStatus porque el Swagger no lo exige y los estados válidos no están documentados
import { apiClient, API_CONFIG, type APIResponse } from '@/api'
import type { RequestContext } from '@/features/auth'
import type { CancelSaleInput, RegisteredSale, RegisterSaleBody, RegisterSaleInput } from '../types/shop.sales.types'

const { SALES } = API_CONFIG.ENDPOINTS

const numberOrUndefined = (value: unknown): number | undefined => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined)

// la respuesta puede venir vacía o con { saleId, serialCode }: se toma lo que haya
export const toRegisteredSale = (data: unknown): RegisteredSale => {
  const row = (data && typeof data === 'object' ? (data as Record<string, unknown>) : {}) as Record<string, unknown>
  return { saleId: numberOrUndefined(row.saleId), serialCode: numberOrUndefined(row.serialCode) }
}

export const registerSale = async (ctx: RequestContext, input: RegisterSaleInput): Promise<RegisteredSale> => {
  const body: RegisterSaleBody = {
    companyId: ctx.companyId,
    userId: input.customerId ?? ctx.userId,
    sellerId: ctx.userId,
    warehouseId: input.warehouseId,
    uuid: input.uuid,
    saleType: 'sale',
    paymentMethod: input.paymentMethod,
    totalAmount: input.totalAmount,
  }
  const { data } = await apiClient.post<APIResponse<unknown>>(SALES.REGISTER, body)
  return toRegisteredSale(data?.data)
}

export const cancelSale = async (ctx: RequestContext, input: CancelSaleInput): Promise<void> => {
  await apiClient.post(SALES.CANCEL, { saleId: input.saleId, userId: ctx.userId, reason: input.reason.trim() })
}
