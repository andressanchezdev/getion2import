// wallet.types · contratos de cartera que usa la app: clientes con crédito, facturas, resumen, filtros y estado del slice
// conecta con: wallet.adapter (convierte lo del backend), wallet.constants, wallet.slice, wallet.selectors y los componentes de wallet (lo que responde el backend está en wallet.api.types)
// ojo: los estados van en inglés (código), el texto que ve el cliente se arma en los componentes
// ojo: el estado de crédito sale solo de lo que trae el listado del backend (¿tiene crédito? ¿debe algo?); la mora por factura se ve en el estado de cuenta, donde sí hay fechas
import type { LoadStatus, PaginatorMetadata } from '@/api'

export type CreditStatus = 'upToDate' | 'withBalance' | 'blocked'

export interface CreditInvoice {
  id: string // id de la venta como texto (así se usa de key)
  saleId: number
  invoiceNumber: string // ej. #1234
  orderNumber: string // ej. Pedido 5678
  issueDate: string // YYYY-MM-DD
  dueDate: string // emisión + días de crédito
  totalAmount: number
  paidAmount: number // pagos verificados
  pendingBalance: number // total menos pagos verificados
  daysOverdue: number
  status: 'paid' | 'current' | 'overdue'
}

export interface CustomerCreditProfile {
  id: number // userId
  documentId: string // cédula o NIT
  businessName: string // nombre del cliente (el listado de cartera no trae razón social)
  creditDays: number // plazo de crédito
  isCredit: boolean // tiene crédito habilitado
  creditLimit: number // cupo total asignado en COP
  usedCredit: number // saldo adeudado
  reservedCredit: number // cupo reservado por pedidos en curso
  availableCredit: number // cupo disponible: cupo - saldo - reservado (nunca negativo)
  creditStatus: CreditStatus
}

// totales de las tarjetas de arriba (POST /wallet/summary)
export interface WalletSummary {
  totalCreditExtended: number // cupo total aprobado
  totalOutstandingDebt: number // total por cobrar
  totalAvailableCredit: number
  customersOverdue: number // clientes en mora (cantidad)
  totalCustomersWithCredit: number
  averageCreditDays: number
}

export interface WalletFilters {
  searchQuery: string
  statusFilter: 'all' | CreditStatus
}

// ---- estado del slice (no se guarda en el navegador: todo viene del backend) ----
export interface WalletListState {
  items: CustomerCreditProfile[]
  status: LoadStatus
  error: string | null
  meta: PaginatorMetadata | null
  page: number
  requestId: string | null // la última carga lanzada: una respuesta anterior se descarta
}

export interface WalletSummaryState {
  data: WalletSummary | null
  status: LoadStatus
  error: string | null
}

// facturas del cliente abierto; saving = hay un abono o un cambio de cupo en curso
export interface WalletInvoicesState {
  items: CreditInvoice[]
  status: LoadStatus
  error: string | null
  saving: boolean
}

// un abono o recaudo del historial de pagos
export interface AbonoRecord {
  id: number
  serialCode: string
  date: string
  customerName: string
  customerDoc: string
  saleSerial?: string
  method: 'cash' | 'transfer' | string
  reference?: string
  amount: number
  status: 'verified' | 'pending' | 'void'
  saleId?: number
  warehouseId?: number
  warehouseCode?: string
  warehouseName?: string
  employeeName?: string // quien registró el pago
  verifiedByName?: string
  proofUrl?: string
  note?: string
}

export interface AbonoFilters {
  query: string
  method: string
  status: string
  warehouse?: string
}

// un cliente que se puede elegir para habilitarle crédito
export interface CreditCustomerOption {
  id: number
  name: string
  identification: string
  email?: string
  creditLimit: number
  creditDays: number
  isCredit: boolean
}

// el cliente con el que se abre «Habilitar crédito» desde otra pantalla (por ejemplo la tabla de clientes); sin él el panel muestra el buscador
export interface EnableCreditPayload {
  id: number
  name: string
  identification: string
}

// una lista que se pide al backend; requestId descarta respuestas de pedidos anteriores
interface RemoteList<T> {
  items: T[]
  status: LoadStatus
  error: string | null
  requestId: string | null
}

export interface WalletState {
  list: WalletListState
  summary: WalletSummaryState
  filters: WalletFilters
  selectedCustomer: CustomerCreditProfile | null // cliente abierto en el panel (copia: no se pierde si cambia la página)
  isAccountDrawerOpen: boolean
  invoices: WalletInvoicesState
  history: RemoteList<AbonoRecord> // historial de abonos y recaudos
  creditSearch: RemoteList<CreditCustomerOption> // clientes encontrados al habilitar crédito
}
