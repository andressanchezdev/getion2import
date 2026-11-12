// transfers.service · llamadas al backend de traslados entre bodegas
import { apiClient, API_CONFIG, createAppError, toPaginated, withCompany, type APIResponse } from '@/api'
import type { RequestContext } from '@/features/auth'
import type { StockFullDto } from '@/features/inventory'
import { TRANSFERS_PAGE_SIZE, TRANSFER_SEARCH_LIMIT, WAREHOUSE_STOCK_PAGE_SIZE } from '../constants/transfers.constants'
import { toProductStockMatrix, toTrasladeItem } from '../helpers/transfers.adapter'
import type {
  CreateTransferBody,
  ReceiveTransferBody,
  TransferDto,
  TransferProductDto,
  TransferStockRowDto,
} from '../types/transfers.api.types'
import type { CreateTransferBatchInput, ProductStockMatrix, TrasladeItem } from '../types/transfers.types'

const { TRANSFERS, PRODUCTS, INVENTORY } = API_CONFIG.ENDPOINTS

export type TransferDirection = 'incoming' | 'outgoing'

// trae todos los traslados de la bodega o compañía
export const fetchAllTraslades = async (ctx: RequestContext, warehouseId?: number): Promise<TrasladeItem[]> => {
  try {
    const { data } = await apiClient.get<APIResponse<TransferDto[] | null>>(TRANSFERS.LIST, {
      params: withCompany(ctx.companyId, {
        ...(warehouseId ? { warehouseId } : {}),
        page: 1,
        pageSize: TRANSFERS_PAGE_SIZE,
      }),
    })
    return toPaginated(data).items.map(toTrasladeItem)
  } catch {
    // Si la ruta genérica falla o no filtra, probamos por incoming y outgoing combinados
    if (!warehouseId) return []
    try {
      const [inc, out] = await Promise.all([
        fetchTraslades(ctx, 'incoming', warehouseId),
        fetchTraslades(ctx, 'outgoing', warehouseId),
      ])
      const map = new Map<number, TrasladeItem>()
      inc.forEach((i) => map.set(i.id, i))
      out.forEach((i) => map.set(i.id, i))
      return Array.from(map.values())
    } catch {
      return []
    }
  }
}

// los traslados que entran a la bodega (destino) o salen de ella (origen)
export const fetchTraslades = async (ctx: RequestContext, direction: TransferDirection, warehouseId: number): Promise<TrasladeItem[]> => {
  const { data } = await apiClient.get<APIResponse<TransferDto[] | null>>(TRANSFERS.LIST, {
    params: withCompany(ctx.companyId, {
      [direction === 'incoming' ? 'destinationWarehouseId' : 'originWarehouseId']: warehouseId,
      page: 1,
      pageSize: TRANSFERS_PAGE_SIZE,
    }),
  })
  return toPaginated(data).items.map(toTrasladeItem)
}

// la ubicación (stockId) de la bodega de origen de la que sale el producto, la que más vendible tenga y alcance para la cantidad
const findOriginStockId = async (ctx: RequestContext, originWarehouseId: number, productId: number, quantity: number): Promise<number> => {
  const { data } = await apiClient.get<APIResponse<TransferStockRowDto[] | null>>(INVENTORY.STOCK, {
    params: withCompany(ctx.companyId, { warehouseId: originWarehouseId, productId, page: 1, pageSize: 200 }),
  })
  const rows = (data.data ?? []).filter((row) => row.sellable >= quantity)
  if (rows.length === 0) throw createAppError('No hay stock suficiente de este producto en la bodega de origen.')
  return rows.reduce((best, row) => (row.sellable > best.sellable ? row : best)).stockId
}

// crea UN traslado con varios productos de una misma bodega de origen hacia el destino; busca antes la ubicación de cada producto
export const createTransferBatch = async (ctx: RequestContext, input: CreateTransferBatchInput): Promise<TrasladeItem> => {
  const items = []
  for (const item of input.items) {
    items.push({ productId: item.productId, originStockId: await findOriginStockId(ctx, input.originWarehouseId, item.productId, item.quantity), quantity: item.quantity })
  }
  const body: CreateTransferBody = {
    originWarehouseId: input.originWarehouseId,
    destinationWarehouseId: input.destWarehouseId,
    ...(input.type ? { transferType: input.type } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    ...(input.isPriority ? { isPriority: input.isPriority } : {}),
    items,
  }
  const { data } = await apiClient.post<APIResponse<TransferDto>>(TRANSFERS.LIST, body)
  return toTrasladeItem(data.data)
}

// despacha un traslado (pasa a en tránsito)

// detalle completo de un traslado por su id (incluyendo renglones de detalles_transfer)
export const fetchTransferById = async (transferId: number): Promise<TrasladeItem> => {
  const { data } = await apiClient.get<APIResponse<TransferDto>>(TRANSFERS.DETAIL(transferId))
  return toTrasladeItem(data.data)
}

export const dispatchTransfer = async (transferId: number): Promise<TrasladeItem | null> => {
  const res = await apiClient.post<APIResponse<TransferDto>>(TRANSFERS.DISPATCH(transferId), {})
  return res?.data?.data ? toTrasladeItem(res.data.data) : null
}

// recibe o acepta el traslado (OK completo o con novedades)
export const acceptTransfer = async (transfer: TrasladeItem, noveltyNotes?: string): Promise<TrasladeItem | null> => {
  const hasNovelty = Boolean(noveltyNotes?.trim())
  const body: ReceiveTransferBody = {
    hasNovelty,
    noveltyNotes: noveltyNotes?.trim() || undefined,
    items: transfer.products.map((product) => ({
      itemId: product.itemId,
      receivedQty: product.quantity,
      destinationLocation: product.destinationLocation,
    })),
  }
  const res = await apiClient.post<APIResponse<TransferDto>>(TRANSFERS.RECEIVE(transfer.id), body)
  return res?.data?.data ? toTrasladeItem(res.data.data) : null
}

// función compatible con la llamada original de receiveTransfer
export const receiveTransfer = async (transfer: TrasladeItem): Promise<TrasladeItem | null> => {
  return acceptTransfer(transfer)
}

// anula el traslado con el motivo
export const cancelTransfer = async (transferId: number, reason: string): Promise<TrasladeItem | null> => {
  const res = await apiClient.post<APIResponse<TransferDto>>(TRANSFERS.CANCEL(transferId), { reason })
  return res?.data?.data ? toTrasladeItem(res.data.data) : null
}

// busca productos activos por texto y trae sus existencias en todas las bodegas
export const searchProductsMultibodega = async (
  ctx: RequestContext,
  warehouses: Array<{ id: string | number; name: string }>,
  text?: string
): Promise<ProductStockMatrix[]> => {
  const query = text?.trim()
  const { data } = query
    ? await apiClient.get<APIResponse<TransferProductDto[] | null>>(PRODUCTS.SEARCH, { params: { q: query, page: 1, pageSize: TRANSFER_SEARCH_LIMIT } })
    : await apiClient.get<APIResponse<TransferProductDto[] | null>>(PRODUCTS.LIST, {
        params: withCompany(ctx.companyId, { status: 'active', page: 1, pageSize: TRANSFER_SEARCH_LIMIT }),
      })
  const products = (data.data ?? []).slice(0, TRANSFER_SEARCH_LIMIT)
  return Promise.all(
    products.map(async (product) => {
      const { data: stock } = await apiClient.get<APIResponse<TransferStockRowDto[] | null>>(INVENTORY.STOCK, {
        params: withCompany(ctx.companyId, { productId: product.id, page: 1, pageSize: 200 }),
      })
      return toProductStockMatrix(product, stock.data ?? [], warehouses)
    })
  )
}

// lo vendible de un producto en CADA bodega de la compañía (bodega → unidades), sumando sus ubicaciones; las bodegas sin filas no aparecen (son cero)
export const fetchProductStockByWarehouse = async (ctx: RequestContext, productId: number): Promise<Record<string, number>> => {
  const { data } = await apiClient.get<APIResponse<TransferStockRowDto[] | null>>(INVENTORY.STOCK, {
    params: withCompany(ctx.companyId, { productId, page: 1, pageSize: 200 }),
  })
  const byWarehouse: Record<string, number> = {}
  for (const row of data.data ?? []) byWarehouse[String(row.warehouseId)] = (byWarehouse[String(row.warehouseId)] ?? 0) + Math.max(0, row.sellable)
  return byWarehouse
}

// existencias de una bodega (con búsqueda por repuesto, código o estante) para la pestaña «Repuestos en sede»
export const fetchWarehouseStock = async (ctx: RequestContext, warehouseId: number, query: string): Promise<StockFullDto[]> => {
  const { data } = await apiClient.get<APIResponse<StockFullDto[] | null>>(INVENTORY.STOCK, {
    params: withCompany(ctx.companyId, { warehouseId, q: query.trim(), page: 1, pageSize: WAREHOUSE_STOCK_PAGE_SIZE }),
  })
  return data.data ?? []
}
