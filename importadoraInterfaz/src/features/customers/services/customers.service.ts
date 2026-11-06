// customers.service · llamadas al backend de clientes: GET /customers (listado paginado), GET /customers/:id (detalle), POST /customers, PUT /customers/:id y DELETE /customers/:id
// conecta con: api/client, api/config, api/params y api/pagination (toPaginated), customers.adapter (convierte); las usa customers.thunks
// ojo: la compañía sale del token; solo el superadmin (sin compañía) manda companyId. Los clientes de otros estados (inactivos) no se listan
import { apiClient, API_CONFIG, toPaginated, withCompany, type APIResponse, type Paginated } from '@/api'
import type { RequestContext } from '@/features/auth'
import { toCustomer, toCustomerDetail } from '../helpers/customers.adapter'
import type { CreateCustomerBody, CustomerDto, UpdateCustomerBody } from '../types/customers.api.types'
import type { Customer, CustomerDetail } from '../types/customers.types'

const { CUSTOMERS } = API_CONFIG.ENDPOINTS

// ojo: q lo resuelve el servidor (nombre, documento, correo o teléfono) para que la búsqueda cubra todos los clientes y no solo la página cargada
export const fetchCustomersPage = async (ctx: RequestContext, page: number, pageSize: number, query = ''): Promise<Paginated<Customer>> => {
  const { data } = await apiClient.get<APIResponse<CustomerDto[] | null>>(CUSTOMERS.LIST, {
    params: withCompany(ctx.companyId, { page, pageSize, q: query.trim() || undefined }),
  })
  const result = toPaginated(data)
  return { items: result.items.map(toCustomer), meta: result.meta }
}

// trae el detalle completo de un cliente por su id
export const fetchCustomerDetail = async (id: number): Promise<CustomerDetail> => {
  const { data } = await apiClient.get<APIResponse<CustomerDto>>(CUSTOMERS.BY_ID(id))
  return toCustomerDetail(data.data)
}

// ¿ya existe un cliente con este documento o correo? busca por texto y compara de forma exacta (la API no tiene rutas de "validar")
export const customerExists = async (field: 'document' | 'email', value: string): Promise<boolean> => {
  const { data } = await apiClient.get<APIResponse<CustomerDto[] | null>>(CUSTOMERS.SEARCH, { params: { q: value, page: 1, pageSize: 20 } })
  const wanted = value.trim().toLowerCase()
  return (data.data ?? []).some((customer) => String(customer[field] ?? '').trim().toLowerCase() === wanted)
}

// registra un cliente (la compañía sale del token); devuelve el cliente creado
export const createCustomer = async (body: CreateCustomerBody): Promise<Customer> => {
  const { data } = await apiClient.post<APIResponse<CustomerDto>>(CUSTOMERS.LIST, body)
  return toCustomer(data.data)
}

// edita datos de un cliente (PUT /customers/:id); la API actualiza solo los campos que llegan
export const updateCustomer = async (id: number, body: UpdateCustomerBody): Promise<void> => {
  await apiClient.put(CUSTOMERS.BY_ID(id), body)
}

// elimina un cliente (DELETE /customers/:id): la API lo manda a la papelera de reciclaje, no lo borra del todo
export const deleteCustomer = async (id: number, reason: string): Promise<void> => {
  await apiClient.delete(CUSTOMERS.BY_ID(id), { data: { reason } })
}
