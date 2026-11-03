// checkout.service · llamadas al backend para finalizar una compra: buscar clientes (GET /customers/search), traer uno con su cupo (GET /customers/:id y /customers/selector), y crear la venta (POST /sales)
// conecta con: api/client, api/config, api/params, checkout.adapter (convierte) y shop.sales.service (createSale); las usa checkout.thunks
// ojo: un cliente es de la compañía (no de una bodega): se busca sin filtrar por bodega; la compañía sale del token (el superadmin manda la que eligió)
import { apiClient, API_CONFIG, withCompany, type APIResponse } from '@/api'
import type { RequestContext } from '@/features/auth'
import { toCheckoutCustomer } from '../helpers/checkout.adapter'
import type { CheckoutCustomerDto, CheckoutSelectorDto } from '../types/checkout.api.types'
import type { CheckoutCustomer } from '../types/checkout.types'

const { CUSTOMERS } = API_CONFIG.ENDPOINTS
const SEARCH_LIMIT = 8

// resultados de la búsqueda: nombre y documento bastan para elegir; el detalle completo se pide al elegir
export const searchCheckoutCustomers = async (ctx: RequestContext, query: string): Promise<CheckoutCustomer[]> => {
  const { data } = await apiClient.get<APIResponse<CheckoutCustomerDto[] | null>>(CUSTOMERS.SEARCH, {
    params: withCompany(ctx.companyId, { q: query.trim(), page: 1, pageSize: SEARCH_LIMIT }),
  })
  return (data.data ?? []).map((dto) => toCheckoutCustomer(dto, 0))
}

// el cliente completo (direcciones, descuento y crédito) con el cupo que le queda
export const fetchCheckoutCustomer = async (id: number): Promise<CheckoutCustomer> => {
  const [{ data }, selector] = await Promise.all([
    apiClient.get<APIResponse<CheckoutCustomerDto>>(CUSTOMERS.BY_ID(id)),
    apiClient.get<APIResponse<CheckoutSelectorDto[] | null>>(CUSTOMERS.SELECTOR),
  ])
  const available = (selector.data.data ?? []).find((row) => row.id === id)?.availableCredit ?? 0
  return toCheckoutCustomer(data.data, available)
}
