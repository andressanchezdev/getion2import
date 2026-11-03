// shop.sales.service · llamadas al backend para crear un pedido (POST /sales) y anularlo (POST /sales/:id/cancel)
// conecta con: api/client y api/config (SALES), RequestContext; los usan shop (crear) y orders.thunks (anular)
// ojo: la API en Go toma la compañía y el vendedor del token y arma el pedido con los renglones que se le mandan (stockId, cantidad y precio); no lee el carrito
import { apiClient, API_CONFIG, compactParams, type APIResponse } from '@/api'
import type { RequestContext } from '@/features/auth'

export interface CreateSaleLine {
  stockId: number
  quantity: number
  unitPrice: number
  discount?: number // porcentaje (0-100): el descuento general del cliente
}

export interface CreateSaleInput {
  warehouseId: number
  customerId?: number
  salespersonEmployeeId?: number // el empleado al que se le asigna la venta (obligatorio si la confirma un administrador)
  quotationId?: number // la cotización de la que sale el pedido
  shippingAddress?: Record<string, string> // datos de entrega (JSON libre en la API)
  cartId?: number
  paymentMethod: 'cash' | 'transfer' | 'credit'
  paymentCondition?: 'cash' | 'credit'
  priceTier?: 'p1' | 'p2' | 'p3' | 'p4'
  immediatePicking?: boolean
  proofUrl?: string
  paymentReference?: string
  notes?: string
  items: CreateSaleLine[]
}

// lo que se usa del pedido recién creado
export interface CreatedSale {
  id: number
  serialCode: string
  total: number
}

export interface CancelSaleInput {
  saleId: number
  reason: string
}

const { SALES } = API_CONFIG.ENDPOINTS

// crea el pedido con sus renglones; el backend lo deja en verificación
export const createSale = async (input: CreateSaleInput): Promise<CreatedSale> => {
  const { items, shippingAddress, ...head } = input
  // la dirección de entrega es un objeto (JSON libre en la API): va aparte de los datos simples, que se limpian
  const { data } = await apiClient.post<APIResponse<CreatedSale>>(SALES.LIST, { ...compactParams(head), ...(shippingAddress && { shippingAddress }), items })
  return data.data
}

// anula un pedido con su motivo; la API no deja anular uno que ya está en despacho o enviado
// ojo: el contexto ya no se usa (el empleado sale del token); se conserva en la firma para que orders.thunks no cambie
export const cancelSale = async (_ctx: RequestContext, input: CancelSaleInput): Promise<void> => {
  await apiClient.post(SALES.ACTION(input.saleId, 'cancel'), { reason: input.reason.trim() })
}
