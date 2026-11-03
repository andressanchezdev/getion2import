// wallet.service · llamadas al backend de cartera: GET /customers?creditEnabled=true (clientes con crédito), GET /customers/selector (cupo disponible),
// GET /reports/wallet (deuda total) y GET /sales (las ventas a crédito de un cliente)
// conecta con: api/client, api/config, api/params y api/pagination (toPaginated), wallet.adapter (convierte); las usa wallet.thunks
// ojo: la API toma la compañía del token; este service no lee el almacenamiento ni el store. La bodega no filtra la cartera: la deuda es del cliente, no de la bodega
import { apiClient, API_CONFIG, toPaginated, withCompany, type APIResponse, type Paginated } from '@/api'
import type { RequestContext } from '@/features/auth'
import { ABONOS_PAGE_SIZE, CREDIT_SEARCH_PAGE_SIZE, WALLET_INVOICES_PAGE_SIZE } from '../constants/wallet.constants'
import { toAbonoRecord, toCreditCustomerOption, toCustomerCredit, toInvoice, toWalletSummary, type AvailableCreditById } from '../helpers/wallet.adapter'
import type { CreditCustomerDto, PaymentHistoryDto, WalletCustomerDto, WalletReportDto, WalletSaleDto, WalletSelectorDto } from '../types/wallet.api.types'
import type { AbonoRecord, CreditCustomerOption, CreditInvoice, CustomerCreditProfile, WalletSummary } from '../types/wallet.types'

const { CUSTOMERS, REPORTS, SALES, PAYMENTS } = API_CONFIG.ENDPOINTS

// la lista de clientes con crédito se pide de a 200 (máximo de la API) para los totales
const SUMMARY_PAGE_SIZE = 200

// cupo disponible de cada cliente (GET /customers/selector)
const fetchAvailableCredit = async (): Promise<AvailableCreditById> => {
  const { data } = await apiClient.get<APIResponse<WalletSelectorDto[] | null>>(CUSTOMERS.SELECTOR)
  return new Map((data.data ?? []).map((row) => [row.id, row.availableCredit ?? 0]))
}

// pide una página de clientes con crédito habilitado
const fetchCreditCustomers = async (ctx: RequestContext, page: number, pageSize: number) => {
  const { data } = await apiClient.get<APIResponse<WalletCustomerDto[] | null>>(CUSTOMERS.LIST, {
    params: withCompany(ctx.companyId, { creditEnabled: true, page, pageSize }),
  })
  return toPaginated(data)
}

// trae una página de la cartera ya convertida a clientes con su crédito
export const fetchWalletPage = async (ctx: RequestContext, page: number, pageSize: number): Promise<Paginated<CustomerCreditProfile>> => {
  const [result, available] = await Promise.all([fetchCreditCustomers(ctx, page, pageSize), fetchAvailableCredit()])
  return { items: result.items.map((customer) => toCustomerCredit(customer, available)), meta: result.meta }
}

// trae los totales de cartera (por cobrar, en mora, cupo y clientes con crédito)
export const fetchWalletSummary = async (ctx: RequestContext): Promise<WalletSummary> => {
  const [customers, available, report] = await Promise.all([
    fetchCreditCustomers(ctx, 1, SUMMARY_PAGE_SIZE),
    fetchAvailableCredit(),
    apiClient.get<APIResponse<WalletReportDto | null>>(REPORTS.WALLET).then((res) => res.data.data ?? {}),
  ])
  return toWalletSummary(customers.items, available, report)
}

// las ventas a crédito del cliente (primera página de 50), de la más nueva a la más vieja según la API
export const fetchCustomerInvoices = async (ctx: RequestContext, customerId: number): Promise<CreditInvoice[]> => {
  const { data } = await apiClient.get<APIResponse<WalletSaleDto[] | null>>(SALES.LIST, {
    params: withCompany(ctx.companyId, { customerId, paymentMethod: 'credit', page: 1, pageSize: WALLET_INVOICES_PAGE_SIZE }),
  })
  const now = Date.now()
  return toPaginated(data).items.filter((sale) => sale.status !== 'cancelled').map((sale) => toInvoice(sale, now))
}

// historial de abonos y recaudos (GET /payments)
export const fetchPaymentsHistory = async (ctx: RequestContext): Promise<AbonoRecord[]> => {
  const { data } = await apiClient.get<APIResponse<PaymentHistoryDto[] | null>>(PAYMENTS.LIST, {
    params: withCompany(ctx.companyId, { page: 1, pageSize: ABONOS_PAGE_SIZE }),
  })
  return (data.data ?? []).map(toAbonoRecord)
}

// busca clientes por nombre, documento o correo para habilitarles crédito (GET /customers/search)
export const searchCreditCustomers = async (query: string): Promise<CreditCustomerOption[]> => {
  const { data } = await apiClient.get<APIResponse<CreditCustomerDto[] | null>>(CUSTOMERS.SEARCH, {
    params: { q: query.trim(), page: 1, pageSize: CREDIT_SEARCH_PAGE_SIZE },
  })
  return (data.data ?? []).map(toCreditCustomerOption)
}
