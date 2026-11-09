// returns.service · llamadas al backend de devoluciones (/returns) y búsqueda de la venta a la que se asocian (/sales)
// conecta con: api/client y api/config (rutas en SALES_ENDPOINTS.RETURNS y SALES); las usan returns.thunks
// ojo: solo HTTP; la API deduce la compañía del token, por eso no se manda companyId
import { apiClient, API_CONFIG, toPaginated, type APIResponse } from '@/api'
import { RETURNS_PAGE_SIZE } from '../constants/returns.constants'
import type { CreateReturnInput, ReturnDto, SaleOption } from '../types/returns.types'

const { RETURNS, SALES } = API_CONFIG.ENDPOINTS

export const fetchReturns = async (warehouseId: number | null): Promise<ReturnDto[]> => {
  const params = { page: 1, pageSize: RETURNS_PAGE_SIZE, warehouseId: warehouseId || undefined }
  const { data } = await apiClient.get<APIResponse<ReturnDto[] | null>>(RETURNS.LIST, { params })
  return toPaginated(data).items
}

export const createReturn = async (input: CreateReturnInput): Promise<ReturnDto> => {
  const { data } = await apiClient.post<APIResponse<ReturnDto>>(RETURNS.LIST, input)
  return data.data!
}

export const approveReturn = async (id: number): Promise<void> => {
  await apiClient.post(RETURNS.APPROVE(id))
}

export const rejectReturn = async (id: number, reason: string): Promise<void> => {
  await apiClient.post(RETURNS.REJECT(id), { reason })
}

// ventas que coinciden con el texto (pedido, cliente o NIT); sin texto trae las más recientes
export const searchSales = async (query: string): Promise<SaleOption[]> => {
  const { data } = await apiClient.get<APIResponse<SaleOption[] | null>>(SALES.LIST, {
    params: { page: 1, pageSize: 10, search: query || undefined },
  })
  return toPaginated(data).items
}

// la venta con sus renglones, para elegir qué se devuelve
export const fetchSaleWithItems = async (saleId: number): Promise<SaleOption> => {
  const { data } = await apiClient.get<APIResponse<SaleOption>>(SALES.BY_ID(saleId))
  return data.data!
}
