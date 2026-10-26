// wallet.service · llamadas al backend de cartera: POST /wallet (clientes con crédito), POST /wallet/summary (totales) y POST /wallet/internal (facturas de un cliente)
// conecta con: api/client, api/config y api/pagination (toPaginated), wallet.adapter (convierte); las usa wallet.thunks
// ojo: el companyId llega en el contexto de petición; este service no lee el almacenamiento ni el store. warehouseId es opcional (sin bodega elegida no se manda)
import { apiClient, API_CONFIG, toPaginated, type APIResponse, type Paginated } from '@/api'
import type { RequestContext } from '@/features/auth'
import { WALLET_INVOICES_PAGE_SIZE } from '../constants/wallet.constants'
import { toCustomerCredit, toInvoice, toWalletSummary } from '../helpers/wallet.adapter'
import type { WalletBillDto, WalletSummaryDto, WalletUserDto } from '../types/wallet.api.types'
import type { CreditInvoice, CustomerCreditProfile, WalletSummary } from '../types/wallet.types'

const { WALLET } = API_CONFIG.ENDPOINTS

const withWarehouse = (warehouseId?: number) => (warehouseId !== undefined ? { warehouseId } : {})

export const fetchWalletPage = async (
  ctx: RequestContext,
  page: number,
  pageSize: number,
  warehouseId?: number
): Promise<Paginated<CustomerCreditProfile>> => {
  const { data } = await apiClient.post<APIResponse<WalletUserDto[] | null>>(WALLET.BASE, {
    companyId: ctx.companyId,
    page,
    pageSize,
    ...withWarehouse(warehouseId),
  })
  const result = toPaginated(data)
  return { items: result.items.map(toCustomerCredit), meta: result.meta }
}

export const fetchWalletSummary = async (ctx: RequestContext, warehouseId?: number): Promise<WalletSummary> => {
  const { data } = await apiClient.post<APIResponse<WalletSummaryDto>>(WALLET.SUMMARY, {
    companyId: ctx.companyId,
    ...withWarehouse(warehouseId),
  })
  return toWalletSummary(data.data ?? {})
}

export const fetchCustomerInvoices = async (
  ctx: RequestContext,
  customerId: number,
  warehouseId?: number,
  creditDays = 0
): Promise<CreditInvoice[]> => {
  const { data } = await apiClient.post<APIResponse<WalletBillDto[] | null>>(WALLET.INTERNAL, {
    companyId: ctx.companyId,
    userId: customerId,
    page: 1,
    pageSize: WALLET_INVOICES_PAGE_SIZE,
    ...withWarehouse(warehouseId),
  })
  const now = Date.now()
  return (data.data ?? []).map((bill) => toInvoice(bill, now, creditDays))
}
