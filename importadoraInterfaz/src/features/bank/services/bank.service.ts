// bank.service · llamadas al backend de la conciliación bancaria: subir el PDF del banco, listar sus movimientos, confirmarlos o ignorarlos y traer los pagos por verificar
// conecta con: api/client y api/config (rutas), bank.adapter (convierte); las usa bank.thunks
// ojo: todo arranca del PDF que entrega el banco: sin PDF subido no hay movimientos; el backend ignora los movimientos que ya estaban cargados
import { apiClient, API_CONFIG, toPaginated, type APIResponse, type Paginated } from '@/api'
import { toBankRecord, toPendingPayment, toUploadResult } from '../helpers/bank.adapter'
import type { BankFilters, BankRecord, BankRecordDto, BankUploadDto, BankUploadResult, PendingPayment, PendingPaymentDto } from '../types/bank.types'

const { BANK_STATEMENTS, PAYMENTS } = API_CONFIG.ENDPOINTS
const PENDING_PAYMENTS_LIMIT = 100

// sube el PDF del banco; la API lo lee y guarda los movimientos nuevos
export const uploadBankStatement = async (file: File): Promise<BankUploadResult> => {
  const body = new FormData()
  body.append('file', file)
  const { data } = await apiClient.post<APIResponse<BankUploadDto>>(BANK_STATEMENTS.UPLOAD_PDF, body)
  return toUploadResult(data.data)
}

// una página de movimientos con los filtros puestos (solo se mandan los que tienen valor)
export const fetchBankRecords = async (filters: BankFilters, page: number, pageSize: number): Promise<Paginated<BankRecord>> => {
  const params: Record<string, string | number> = { page, pageSize }
  if (filters.status !== 'all') params.status = filters.status
  if (filters.query.trim()) params.description = filters.query.trim()
  if (filters.from) params.from = filters.from
  if (filters.to) params.to = filters.to
  const { data } = await apiClient.get<APIResponse<BankRecordDto[] | null>>(BANK_STATEMENTS.RECORDS, { params })
  const result = toPaginated(data)
  return { items: result.items.map(toBankRecord), meta: result.meta }
}

// confirma que el movimiento entró; con paymentId la API también verifica ese pago
export const confirmBankRecord = async (recordId: number, paymentId?: number, notes?: string): Promise<void> => {
  await apiClient.patch(BANK_STATEMENTS.CONFIRM(recordId), { paymentId, notes: notes?.trim() || undefined })
}

// marca el movimiento como ignorado (no corresponde a ningún pago)
export const ignoreBankRecord = async (recordId: number, notes?: string): Promise<void> => {
  await apiClient.patch(BANK_STATEMENTS.IGNORE(recordId), { notes: notes?.trim() || undefined })
}

// los pagos por transferencia que siguen en revisión: los que un movimiento del banco puede respaldar
export const fetchPendingTransferPayments = async (): Promise<PendingPayment[]> => {
  const { data } = await apiClient.get<APIResponse<PendingPaymentDto[] | null>>(PAYMENTS.LIST, { params: { status: 'review', method: 'transfer', page: 1, pageSize: PENDING_PAYMENTS_LIMIT } })
  return toPaginated(data).items.map(toPendingPayment)
}
