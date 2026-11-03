// quotations.service · llamadas al backend de cotizaciones: GET /quotations (lista), GET /quotations/:id (con renglones), POST /quotations y PUT /quotations/:id, y GET /customers (para el WhatsApp de cada cliente)
// conecta con: api/client, api/config, api/params y api/pagination, quotations.adapter (convierte); las usan quotations.thunks y shop.quotation.thunks
// ojo: la API no filtra por fechas, así que se traen todas las cotizaciones de la compañía (de 200 en 200, con tope) y el texto y las fechas se filtran en pantalla
// ojo: el WhatsApp no es un campo de la cotización: es el celular (o teléfono) del cliente, por eso se piden los clientes y se unen por id
import { apiClient, API_CONFIG, toPaginated, withCompany, type APIResponse } from '@/api'
import type { RequestContext } from '@/features/auth'
import { pickWhatsapp, toQuotation } from '../helpers/quotations.adapter'
import type { CreateQuotationBody, QuotationCustomerDto, QuotationCustomerSearchDto, QuotationDto, UpdateQuotationBody } from '../types/quotations.api.types'
import type { Quotation } from '../types/quotations.types'

const { QUOTATIONS, CUSTOMERS } = API_CONFIG.ENDPOINTS
const PAGE_SIZE = 200
const MAX_PAGES = 5

const fetchAllPages = async <T>(url: string, params: Record<string, unknown>): Promise<T[]> => {
  const rows: T[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data } = await apiClient.get<APIResponse<T[] | null>>(url, { params: { ...params, page, pageSize: PAGE_SIZE } })
    const result = toPaginated(data)
    rows.push(...result.items)
    if (!result.meta.hasNextPage) break
  }
  return rows
}

// cliente -> número al que se le envía (celular, o teléfono si no tiene celular)
const fetchCustomerPhones = async (ctx: RequestContext): Promise<Map<number, string>> => {
  const customers = await fetchAllPages<QuotationCustomerDto>(CUSTOMERS.LIST, withCompany(ctx.companyId, {}))
  return new Map(customers.map((customer) => [customer.id, pickWhatsapp(customer.mobile, customer.phone)]))
}

// trae las cotizaciones de la compañía
export const fetchQuotations = async (ctx: RequestContext): Promise<Quotation[]> => {
  const [dtos, phones] = await Promise.all([fetchAllPages<QuotationDto>(QUOTATIONS.LIST, withCompany(ctx.companyId, {})), fetchCustomerPhones(ctx)])
  return dtos.map((dto) => toQuotation(dto, phones))
}

// trae una cotización con sus renglones
export const fetchQuotationDetail = async (ctx: RequestContext, id: number): Promise<Quotation> => {
  const [{ data }, phones] = await Promise.all([apiClient.get<APIResponse<QuotationDto>>(QUOTATIONS.BY_ID(id)), fetchCustomerPhones(ctx)])
  return toQuotation(data.data, phones)
}

// crea una cotización y devuelve su id
export const createQuotation = async (body: CreateQuotationBody): Promise<number> => {
  const { data } = await apiClient.post<APIResponse<QuotationDto>>(QUOTATIONS.LIST, body)
  return data.data.id
}

// actualiza una cotización (por ejemplo, la marca como enviada)
export const updateQuotation = async (id: number, body: UpdateQuotationBody): Promise<void> => {
  await apiClient.put(QUOTATIONS.BY_ID(id), body)
}

// busca clientes por nombre, documento o correo (hasta `limit`)
export const searchCustomers = async (text: string, limit: number): Promise<QuotationCustomerSearchDto[]> => {
  const { data } = await apiClient.get<APIResponse<QuotationCustomerSearchDto[] | null>>(CUSTOMERS.SEARCH, { params: { q: text, page: 1, pageSize: limit } })
  return toPaginated(data).items
}
