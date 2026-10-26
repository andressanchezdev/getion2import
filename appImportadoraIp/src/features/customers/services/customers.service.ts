// customers.service · llamadas al backend de usuarios: POST /users (listado paginado) y GET /users/{id} (detalle)
// conecta con: api/client, api/config y api/pagination (toPaginated), customers.adapter (convierte); las usa customers.thunks
// ojo: el companyId llega en el contexto de petición; este service no lee el almacenamiento ni el store
import { apiClient, API_CONFIG, toPaginated, type APIResponse, type Paginated } from '@/api'
import type { RequestContext } from '@/features/auth'
import { toCustomer, toCustomerDetail } from '../helpers/customers.adapter'
import type { UserDto } from '../types/customers.api.types'
import type { Customer, CustomerDetail } from '../types/customers.types'

const { USERS } = API_CONFIG.ENDPOINTS

export const fetchCustomersPage = async (ctx: RequestContext, page: number, pageSize: number): Promise<Paginated<Customer>> => {
  const { data } = await apiClient.post<APIResponse<UserDto[] | null>>(USERS.LIST, {
    companyId: ctx.companyId,
    page,
    pageSize,
  })
  const result = toPaginated(data)
  return { items: result.items.map(toCustomer), meta: result.meta }
}

export const fetchCustomerDetail = async (id: number): Promise<CustomerDetail> => {
  const { data } = await apiClient.get<APIResponse<UserDto>>(USERS.BY_ID(id))
  return toCustomerDetail(data.data)
}
