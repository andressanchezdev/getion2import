// bank.types · contratos de la conciliación bancaria: movimientos leídos del PDF del banco, pagos por verificar, filtros y estado del slice
// conecta con: bank.adapter (convierte lo del backend), bank.service, bank.slice, bank.selectors y los componentes
import type { LoadStatus, PaginatorMetadata } from '@/api'

// pendiente = leído del PDF y sin revisar; confirmed = cartera confirmó que entró; ignored = no corresponde a ningún pago
export type BankRecordStatus = 'pending' | 'confirmed' | 'ignored'

// ---- lo que usa la app ----
export interface BankRecord {
  id: number
  bank: string
  account: string
  date: string // AAAA-MM-DD, tal como viene en el extracto
  description: string
  channel: string // sucursal o canal por donde entró
  reference: string // la primera referencia que traiga el movimiento
  document: string
  amount: number
  isIncome: boolean // las salidas no se concilian: solo importan las entradas
  status: BankRecordStatus
  confirmedBy: string
  confirmedAt: string
  notes: string
}

// un pago por transferencia que está en revisión y que un movimiento del banco podría respaldar
export interface PendingPayment {
  id: number
  serial: string
  saleSerial: string
  customerName: string
  amount: number
  reference: string
  proofUrl: string
  createdAt: string
}

export interface BankFilters {
  status: BankRecordStatus | 'all'
  query: string // busca en la descripción del movimiento
  from: string // AAAA-MM-DD o ''
  to: string
}

// lo que respondió la API al subir un PDF
export interface BankUploadResult {
  processed: number // movimientos que se leyeron del PDF
  inserted: number // los que eran nuevos y se guardaron (el resto ya estaban)
  account: string // cuenta que dice el extracto
}

// ---- lo que responde la API en Go ----
export interface BankRecordDto {
  id: number
  bankName: string
  accountNumber: string
  movementDate: string
  description: string
  branchChannel: string
  reference1?: string | null
  reference2?: string | null
  documentNumber?: string | null
  amount: number
  isIncome: boolean
  status: string
  confirmedByName?: string | null
  confirmedAt?: string | null
  notes?: string | null
}

export interface BankUploadDto {
  totalProcessed: number
  totalInserted: number
  accountInfo: string
}

export interface PendingPaymentDto {
  id: number
  serialCode: string
  saleSerial: string
  customerName: string
  amount: number
  reference?: string | null
  proofUrl?: string | null
  createdAt: string
}

// ---- estado del slice (no se guarda en el navegador) ----
export interface BankListState {
  items: BankRecord[]
  meta: PaginatorMetadata | null
  status: LoadStatus
  error: string | null
  page: number
  filters: BankFilters
  requestId: string | null // la última carga lanzada: una respuesta anterior se descarta
}

export interface BankState {
  list: BankListState
  upload: { status: LoadStatus; error: string | null; result: BankUploadResult | null }
  pendingPayments: { items: PendingPayment[]; status: LoadStatus; error: string | null }
  saving: boolean // hay una confirmación o un «ignorar» en curso
}
