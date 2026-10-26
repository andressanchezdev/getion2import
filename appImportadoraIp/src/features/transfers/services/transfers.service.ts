// transfers.service · llamadas al backend para traslados multibodega y existencias
// conecta con: apiClient, API_CONFIG, transfers.types, transfers.adapter y Swagger (/sales/traslades, etc.)
import { apiClient, API_CONFIG, toPaginated, type APIResponse } from '@/api'
import type { ProductDto } from '@/features/shop'
import type { CreateTransferInput, ProductStockMatrix, TrasladeItem, TransferStatus } from '../types/transfers.types'
import type { TrasladeCreatedDto, TrasladeDto } from '../types/transfers.api.types'
import { toProductStockMatrix, toTrasladeItems } from '../helpers/transfers.adapter'

const { SALES, CARTS, PRODUCTS, SEARCH } = API_CONFIG.ENDPOINTS

export const fetchTraslades = async (
  warehouseId: number,
  userId?: number,
  page = 1,
  pageSize = 20
): Promise<TrasladeItem[]> => {
  const { data } = await apiClient.post<APIResponse<TrasladeDto[] | null>>(SALES.TRASLADES, {
    warehouseId,
    ...(userId && { userId }),
    page,
    pageSize,
  })

  return toTrasladeItems(toPaginated(data).items)
}

// ojo: POST /sales/traslades filtra por la bodega de DESTINO. Los entrantes salen de la propia bodega; los salientes se buscan en las demás bodegas (donde esta es el origen).
// Si falla la consulta de alguna otra bodega se muestran igual los entrantes y los salientes que sí llegaron
export const fetchWarehouseTransfers = async (warehouseId: number, otherWarehouseIds: number[]): Promise<TrasladeItem[]> => {
  const [incoming, others] = await Promise.all([fetchTraslades(warehouseId), Promise.allSettled(otherWarehouseIds.map((id) => fetchTraslades(id)))])
  const outgoing = others.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])).filter((item) => item.originWarehouse.id === warehouseId)
  const seen = new Set<number>()
  return [...incoming, ...outgoing].filter((item) => !seen.has(item.saleId) && seen.add(item.saleId))
}

export const createTransfer = async (
  input: CreateTransferInput,
  companyId: number,
  userId: number
): Promise<{ serialCode: number | null; saleId: number }> => {
  const uuid = crypto.randomUUID()

  // Fase 1A: Registrar ítem en carrito tipo traslade
  await apiClient.post<APIResponse<unknown>>(CARTS.REGISTER_ITEM, {
    companyId,
    userId,
    warehouseId: input.originWarehouseId,
    auxWarehouseId: input.destWarehouseId,
    uuid,
    productId: input.productId,
    price: 0,
    quantity: input.quantity,
    typeCart: 'traslade',
  })

  // Fase 1B: Formalizar el traslado
  const { data } = await apiClient.post<APIResponse<TrasladeCreatedDto | null>>(SALES.REGISTER, {
    companyId,
    userId,
    warehouseId: input.originWarehouseId,
    auxWarehouseId: input.destWarehouseId,
    uuid,
    saleType: 'traslade',
  })

  const res: TrasladeCreatedDto = data.data || {}
  return {
    // ojo: si el backend no devuelve el serial NO se inventa uno (el receptor lo necesita para aprobar): queda null y la pantalla lo busca en la lista de traslados
    serialCode: res.serialCode ? Number(res.serialCode) : null,
    saleId: res.saleId || res.id || 0,
  }
}

export const approveTransfer = async (saleId: number, code: number): Promise<void> => {
  await apiClient.post(SALES.APPROVED, { saleId, code })
}

export const rejectTransfer = async (saleId: number, reason: string): Promise<void> => {
  await apiClient.post(SALES.TRASLADES_REJECT, { saleId, reason })
}

export const updateTransferStatus = async (
  saleId: number,
  invoiceStatus: Extract<TransferStatus, 'picking' | 'dispatch'>
): Promise<void> => {
  await apiClient.put(SALES.STATUS, { saleId, invoiceStatus })
}

// con texto usa la búsqueda universal del backend (POST /search, type product); sin texto trae la primera página del catálogo
// ojo: antes se traían 40 productos y se filtraban en el navegador, así que un repuesto fuera de esos 40 nunca aparecía (el catálogo real tiene más de 8.000)
export const searchProductsMultibodega = async (
  companyId: number,
  warehouses: Array<{ id: string | number; name: string }>,
  text?: string
): Promise<ProductStockMatrix[]> => {
  const query = text?.trim()
  const { data } = query
    ? await apiClient.post<APIResponse<ProductDto[] | null>>(SEARCH.UNIVERSAL, { companyId, limit: 40, query, type: 'product' })
    : await apiClient.post<APIResponse<ProductDto[] | null>>(PRODUCTS.LIST, { companyId, page: 1, pageSize: 40, isActive: true })
  return toProductStockMatrix(toPaginated(data).items, warehouses)
}
