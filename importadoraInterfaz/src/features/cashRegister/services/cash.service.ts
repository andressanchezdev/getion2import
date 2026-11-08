// cash.service · llamadas a la API de turnos de caja: ver el turno abierto, abrirlo con un fondo y cerrarlo con los montos declarados y los gastos
// conecta con: api/client y api/config (CASH_SESSIONS), cash.helpers (convierte); las usa cash.thunks
// ojo: si el turno no se pudo consultar el error sube (antes se tragaba y la caja parecía cerrada); «no hay turno abierto» es null, no un error
import { apiClient, API_CONFIG, type APIResponse } from '@/api'
import { toCashSession, toInvoiceLine } from '../helpers/cash.helpers'
import type { CashSession, CashSessionDto, CloseCashInput, CollectPaymentInput, CollectResult, InvoiceLineItem, SaleItemDto } from '../types/cash.types'

const { CASH_SESSIONS, PAYMENTS, SALES } = API_CONFIG.ENDPOINTS

export const fetchActiveCashSession = async (warehouseId: number): Promise<CashSession | null> => {
  const { data } = await apiClient.get<APIResponse<CashSessionDto | null>>(CASH_SESSIONS.ACTIVE, { params: { warehouseId } })
  return data.data ? toCashSession(data.data) : null
}

// cobra un pedido con pagos mezclados (efectivo, transferencia y crédito) en una sola operación (POST /payments/batch)
// ojo: el efectivo queda verificado y exige turno abierto; la transferencia queda en revisión hasta conciliarla con el banco; el crédito es lo que el cliente deja a deber
export const collectPayments = async (input: CollectPaymentInput): Promise<CollectResult> => {
  const { data } = await apiClient.post<APIResponse<{ stage: string; paidTotal: number; creditAmount: number; balance: number }>>(PAYMENTS.BATCH, input)
  const result = data.data!
  return { stage: result.stage, paidTotal: result.paidTotal, creditAmount: result.creditAmount, balance: result.balance }
}

export const openCashSession = async (warehouseId: number, openingAmount: number): Promise<CashSession> => {
  const { data } = await apiClient.post<APIResponse<CashSessionDto>>(CASH_SESSIONS.OPEN, { warehouseId, openingAmount })
  return toCashSession(data.data!)
}

export const closeCashSession = async (input: CloseCashInput): Promise<CashSession> => {
  const { data } = await apiClient.post<APIResponse<CashSessionDto>>(CASH_SESSIONS.CLOSE, input)
  return toCashSession(data.data!)
}

// los renglones del pedido para el cotejo físico de la mercancía
export const fetchSaleLines = async (orderId: number): Promise<InvoiceLineItem[]> => {
  const { data } = await apiClient.get<APIResponse<{ items?: SaleItemDto[] } | null>>(SALES.BY_ID(orderId))
  return (data.data?.items ?? []).map(toInvoiceLine)
}
