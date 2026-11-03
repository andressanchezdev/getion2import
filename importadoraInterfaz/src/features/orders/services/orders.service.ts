// orders.service · llamadas al backend de pedidos: GET /sales (lista de una etapa y total por etapa), GET /sales/:id (detalle) y GET /payments (pagos de un pedido)
// conecta con: api/client, api/config, api/params y api/pagination, orders.adapter (convierte); las usan orders.thunks
// ojo: la API no tiene conteos por etapa: el contador de cada etapa es el total (meta.totalRecords) de pedir esa etapa con una sola fila
// ojo: la API no filtra por canal: el filtro «Picking inmediato / Normal» se aplica aquí sobre los pedidos que llegaron
import { apiClient, API_CONFIG, toPaginated, withCompany, type APIResponse } from '@/api'
import type { RequestContext } from '@/features/auth'
import { ORDER_STAGES, ORDERS_PAGE_SIZE } from '../constants/orders.constants'
import { toOrderDetail, toOrderRow, toStageCounts } from '../helpers/orders.adapter'
import type { SaleDto, SalePaymentDto, StageHistoryDto } from '../types/orders.api.types'
import type { OrderChannelFilter, OrderDetail, OrderRow, OrderStageKey, StageCounts } from '../types/orders.types'

const { SALES, PAYMENTS } = API_CONFIG.ENDPOINTS

// pasa el pedido a la siguiente etapa (alistar, empacar, facturar, despachar o enviar); Go rechaza con 409 si no corresponde
export const advanceSale = async (saleId: number, action: 'pick' | 'pack' | 'invoice' | 'dispatch' | 'send'): Promise<void> => {
  await apiClient.post(SALES.ACTION(saleId, action), {})
}

// parámetros de una etapa: solo pedidos abiertos de la bodega
const stageParams = (ctx: RequestContext, warehouseId: number | undefined, stage: OrderStageKey, page: number, pageSize: number) =>
  withCompany(ctx.companyId, { warehouseId: warehouseId || undefined, stage, page, pageSize })

// los contadores de cada etapa (cinco consultas en paralelo)
export const fetchOrderCounts = async (ctx: RequestContext, warehouseId?: number): Promise<StageCounts> => {
  const totals = await Promise.all(
    ORDER_STAGES.map(async ({ key }) => {
      const { data } = await apiClient.get<APIResponse<SaleDto[] | null>>(SALES.LIST, { params: stageParams(ctx, warehouseId, key, 1, 1) })
      return [key, toPaginated(data).meta.totalRecords] as const
    })
  )
  return toStageCounts(Object.fromEntries(totals))
}

export interface OrdersResult {
  items: OrderRow[]
  capped: boolean
}

// la tabla: los pedidos más recientes de una etapa; el canal se filtra aquí
export const fetchOrders = async (
  ctx: RequestContext,
  warehouseId: number | undefined,
  stage: OrderStageKey,
  channel: OrderChannelFilter,
  search = ''
): Promise<OrdersResult> => {
  // ojo: el texto lo filtra el servidor (pedido, cliente o vendedor) para que la búsqueda cubra todos los pedidos de la etapa y no solo los 50 de la pantalla
  const { data } = await apiClient.get<APIResponse<SaleDto[] | null>>(SALES.LIST, {
    params: { ...stageParams(ctx, warehouseId, stage, 1, ORDERS_PAGE_SIZE), search: search.trim() || undefined },
  })
  const page = toPaginated(data)
  const rows = page.items.map((dto) => toOrderRow(dto, stage))
  return { items: channel === 'all' ? rows : rows.filter((row) => row.channel === channel), capped: page.meta.hasNextPage }
}

// el detalle: el pedido con sus renglones y, aparte, sus pagos y el historial de etapas (si el historial falla, el detalle se muestra igual)
export const fetchOrderDetail = async (_ctx: RequestContext, _warehouseId: number | undefined, saleId: number): Promise<OrderDetail> => {
  const [sale, payments, history] = await Promise.all([
    apiClient.get<APIResponse<SaleDto>>(SALES.BY_ID(saleId)),
    apiClient.get<APIResponse<SalePaymentDto[] | null>>(PAYMENTS.LIST, { params: { saleId, page: 1, pageSize: 100 } }),
    apiClient.get<APIResponse<StageHistoryDto[] | null>>(SALES.STAGE_HISTORY(saleId)).catch(() => null),
  ])
  return toOrderDetail(sale.data.data, payments.data.data ?? [], history?.data.data ?? [])
}

// verifica el comprobante de una transferencia: si el pedido ya tiene un pago en revisión lo verifica; si no tiene ninguno, lo crea con el comprobante y lo verifica
export const verifyTransferPayment = async (order: OrderDetail): Promise<void> => {
  const reviewPayment = order.payments.find((p) => p.status === 'review' || p.status === 'pending') || order.payments[0]
  if (reviewPayment) {
    await apiClient.post(PAYMENTS.VERIFY(reviewPayment.id), {})
    return
  }
  const { data } = await apiClient.post<APIResponse<{ id: number } | null>>(PAYMENTS.LIST, {
    saleId: order.id,
    method: 'transfer',
    amount: order.totalAmount,
    proofUrl: order.paymentProofUrl,
    reference: order.paymentReference,
  })
  if (data.data?.id) await apiClient.post(PAYMENTS.VERIFY(data.data.id), {})
}
