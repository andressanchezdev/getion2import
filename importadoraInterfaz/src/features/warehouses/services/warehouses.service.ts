// warehouses.service · llamada al backend de bodegas: POST /warehouses (listado paginado)
// conecta con: api/client, api/config y api/pagination (toPaginated), warehouses.helpers (convierte); la usa warehouses.thunks
// ojo: el companyId llega en el contexto de petición; este service no lee el almacenamiento ni el store
import { apiClient, API_CONFIG, toPaginated, type APIResponse } from '@/api'
import type { RequestContext } from '@/features/auth'
import { WAREHOUSES_PAGE_SIZE } from '../constants/warehouses.constants'
import { toWarehouses } from '../helpers/warehouses.helpers'
import type { Warehouse, WarehouseDto } from '../types/warehouse.types'

export const fetchWarehouses = async (ctx: RequestContext): Promise<Warehouse[]> => {
    const { data } = await apiClient.post<APIResponse<WarehouseDto[] | null>>(API_CONFIG.ENDPOINTS.WAREHOUSES.BASE, {
        companyId: ctx.companyId,
        page: 1,
        pageSize: WAREHOUSES_PAGE_SIZE,
    })
    return toWarehouses(toPaginated(data).items)
}
