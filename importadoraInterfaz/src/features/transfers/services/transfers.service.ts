// transfers.service · llamadas al backend para traslados multibodega y existencias
// conecta con: apiClient, API_CONFIG, transfers.types, transfers.adapter y Swagger (/sales/traslades, etc.)
import { apiClient, API_CONFIG, toPaginated, type APIResponse } from '@/api'
import type { CreateTransferInput, ProductStockMatrix, TrasladeItem } from '../types/transfers.types'
import { toProductStockMatrix, toTrasladeItems } from '../helpers/transfers.adapter'

const { SALES, CARTS, PRODUCTS } = API_CONFIG.ENDPOINTS

export const fetchTraslades = async (
  warehouseId: number,
  userId?: number,
  page = 1,
  pageSize = 20
): Promise<TrasladeItem[]> => {
  const { data } = await apiClient.post<APIResponse<any>>(SALES.TRASLADES, {
    warehouseId,
    ...(userId && { userId }),
    page,
    pageSize,
  })

  const rawItems = Array.isArray(data.data) ? data.data : toPaginated(data).items || []
  return toTrasladeItems(rawItems)
}

export const createTransfer = async (
  input: CreateTransferInput,
  companyId: number,
  userId: number
): Promise<{ serialCode: number; saleId: number }> => {
  const uuid = crypto.randomUUID()

  // Fase 1A: Registrar ítem en carrito tipo traslade
  await apiClient.post<APIResponse<any>>(CARTS.REGISTER_ITEM, {
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
  const { data } = await apiClient.post<APIResponse<any>>(SALES.REGISTER, {
    companyId,
    userId,
    warehouseId: input.originWarehouseId,
    auxWarehouseId: input.destWarehouseId,
    uuid,
    saleType: 'traslade',
    invoiceStatus: 'pendiente',
  })

  const res = data.data || {}
  return {
    serialCode: res.serialCode || Math.floor(100000 + Math.random() * 900000),
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
  invoiceStatus: 'picking_verified' | 'packing_verified'
): Promise<void> => {
  await apiClient.put(SALES.STATUS, { saleId, invoiceStatus })
}

export const searchProductsMultibodega = async (
  companyId: number,
  warehouses: Array<{ id: string | number; name: string }>,
  text?: string
): Promise<ProductStockMatrix[]> => {
  const { data } = await apiClient.post<APIResponse<any>>(PRODUCTS.LIST, {
    companyId,
    page: 1,
    pageSize: 40,
    isActive: true,
  })

  const rawList = toPaginated(data).items as any[]
  return toProductStockMatrix(rawList, warehouses, text)
}
