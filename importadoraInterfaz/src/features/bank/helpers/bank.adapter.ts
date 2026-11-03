// bank.adapter · convierte lo que responde la API (movimientos del banco y pagos por verificar) a lo que usa la app, resume la lista y propone a qué pago corresponde cada movimiento
// conecta con: bank.service (convierte cada respuesta), BankKpis (resumen) y BankConfirmPanel (candidatos); es el único lugar que conoce los nombres del backend en este módulo
import type { BankRecord, BankRecordDto, BankRecordStatus, BankUploadDto, BankUploadResult, PendingPayment, PendingPaymentDto } from '../types/bank.types'

const text = (value: string | null | undefined): string => (value ?? '').trim()

// cualquier estado desconocido se trata como pendiente
const toStatus = (value: string): BankRecordStatus => (value === 'confirmed' || value === 'ignored' ? value : 'pending')

// pasa un movimiento de la API a lo que usa la app
export const toBankRecord = (dto: BankRecordDto): BankRecord => ({
  id: dto.id,
  bank: text(dto.bankName),
  account: text(dto.accountNumber),
  date: text(dto.movementDate).slice(0, 10),
  description: text(dto.description),
  channel: text(dto.branchChannel),
  reference: text(dto.reference1) || text(dto.reference2),
  document: text(dto.documentNumber),
  amount: dto.amount,
  isIncome: dto.isIncome,
  status: toStatus(dto.status),
  confirmedBy: text(dto.confirmedByName),
  confirmedAt: text(dto.confirmedAt),
  notes: text(dto.notes),
})

// pasa un pago por verificar de la API a lo que usa la app
export const toPendingPayment = (dto: PendingPaymentDto): PendingPayment => ({
  id: dto.id,
  serial: dto.serialCode,
  saleSerial: dto.saleSerial,
  customerName: dto.customerName,
  amount: dto.amount,
  reference: text(dto.reference),
  proofUrl: text(dto.proofUrl),
  createdAt: dto.createdAt,
})

// lo que dijo la API al subir un PDF
export const toUploadResult = (dto: BankUploadDto): BankUploadResult => ({ processed: dto.totalProcessed, inserted: dto.totalInserted, account: text(dto.accountInfo) })

export interface BankSummary {
  incomeCount: number
  incomeTotal: number // suma de las entradas de la lista
  pendingCount: number
  pendingTotal: number // entradas todavía sin confirmar ni ignorar
  confirmedTotal: number
}

// totales de las entradas de la lista (las salidas no cuentan)
export const summarizeRecords = (records: BankRecord[]): BankSummary => {
  const income = records.filter((record) => record.isIncome)
  const total = (list: BankRecord[]) => list.reduce((sum, record) => sum + record.amount, 0)
  const pending = income.filter((record) => record.status === 'pending')
  return {
    incomeCount: income.length,
    incomeTotal: total(income),
    pendingCount: pending.length,
    pendingTotal: total(pending),
    confirmedTotal: total(income.filter((record) => record.status === 'confirmed')),
  }
}

// los pagos que podrían corresponder al movimiento: primero los del mismo valor, luego los de valor más cercano; una referencia que coincida va de primera
export const candidatePayments = (record: BankRecord, payments: PendingPayment[]): PendingPayment[] => {
  const ref = record.reference.toLowerCase()
  const score = (payment: PendingPayment) => {
    const sameReference = ref !== '' && payment.reference !== '' && (ref.includes(payment.reference.toLowerCase()) || payment.reference.toLowerCase().includes(ref))
    return (sameReference ? -1_000_000_000 : 0) + Math.abs(payment.amount - record.amount)
  }
  return [...payments].sort((a, b) => score(a) - score(b))
}

// ¿el pago tiene exactamente el valor del movimiento?
export const isExactMatch = (record: BankRecord, payment: PendingPayment): boolean => Math.abs(payment.amount - record.amount) < 0.5

export const STATUS_LABELS: Record<BankRecordStatus, string> = { pending: 'Por confirmar', confirmed: 'Confirmado', ignored: 'Ignorado' }
