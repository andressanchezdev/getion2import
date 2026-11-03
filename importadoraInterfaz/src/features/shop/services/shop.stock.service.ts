// shop.stock.service · llamada al backend del stock: GET /stock (filas por producto, bodega y ubicación)
// conecta con: api/client, api/config y api/params, shop.products.service (une el stock a los productos)
import { apiClient, API_CONFIG, createAppError, toPaginated, withCompany, type APIResponse } from '@/api'
import type { RequestContext } from '@/features/auth'
import type { StockRowDto } from '../types/shop.api.types'

const STOCK_PAGE_SIZE = 200
const STOCK_MAX_PAGES = 25

// trae todas las existencias de la compañía (todas las bodegas)
export const fetchCompanyStock = async (ctx: RequestContext): Promise<StockRowDto[]> => {
    const rows: StockRowDto[] = []
    for (let page = 1; page <= STOCK_MAX_PAGES; page++) {
        const { data } = await apiClient.get<APIResponse<StockRowDto[] | null>>(API_CONFIG.ENDPOINTS.INVENTORY.STOCK, {
            params: withCompany(ctx.companyId, { page, pageSize: STOCK_PAGE_SIZE }),
        })
        const result = toPaginated(data)
        rows.push(...result.items)
        if (!result.meta.hasNextPage) break
    }
    return rows
}

// trae las filas de existencias de una bodega
export const fetchWarehouseStock = async (ctx: RequestContext, warehouseId: number): Promise<StockRowDto[]> => {
    const rows: StockRowDto[] = []
    for (let page = 1; page <= STOCK_MAX_PAGES; page++) {
        const { data } = await apiClient.get<APIResponse<StockRowDto[] | null>>(API_CONFIG.ENDPOINTS.INVENTORY.STOCK, {
            params: withCompany(ctx.companyId, { warehouseId, page, pageSize: STOCK_PAGE_SIZE }),
        })
        const result = toPaginated(data)
        rows.push(...result.items)
        if (!result.meta.hasNextPage) break
    }
    return rows
}

// la ubicación (stockId) de la bodega de la que sale un producto al agregarlo al carrito: la de más stock vendible que alcance para la cantidad
export const findStockId = async (ctx: RequestContext, warehouseId: number, productId: number, quantity: number): Promise<number> => {
    const { data } = await apiClient.get<APIResponse<StockRowDto[] | null>>(API_CONFIG.ENDPOINTS.INVENTORY.STOCK, {
        params: withCompany(ctx.companyId, { warehouseId, productId, page: 1, pageSize: STOCK_PAGE_SIZE }),
    })
    const rows = (data.data ?? []).filter((row) => row.sellable >= quantity)
    if (rows.length === 0) throw createAppError('No hay stock suficiente de este producto en la bodega elegida.')
    return rows.reduce((best, row) => (row.sellable > best.sellable ? row : best)).stockId
}
