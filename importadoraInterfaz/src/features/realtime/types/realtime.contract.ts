// realtime.contract · contrato v1 del websocket: sobre, canales y TODOS los tipos de evento con su cuerpo
// conecta con: realtime.adapter (valida contra esto), realtime.router y los manejadores *.realtime.ts de cada feature
// ojo: debe coincidir campo por campo con importadoraRealtime/contract (JSON Schema) y con importadoraApi/src/core/events/types.go

// ── piezas comunes ───────────────────────────────────────────────────────────────
export type ActorKind = 'employee' | 'admin' | 'superadmin' | 'system'
export interface RealtimeActor {
  type: ActorKind
  id: number | null
  name: string
}

export type EntityKind =
  | 'company'
  | 'admin'
  | 'warehouse'
  | 'warehouse_billing'
  | 'doc_series'
  | 'location'
  | 'customer'
  | 'customer_document'
  | 'supplier'
  | 'carrier'
  | 'brand'
  | 'category'
  | 'model'
  | 'product'
  | 'product_code'
  | 'product_supplier'
  | 'role'
  | 'employee'
  | 'screensaver_settings'

export type DocumentKind =
  | 'sale'
  | 'invoice'
  | 'quotation'
  | 'transfer'
  | 'count'
  | 'purchase'
  | 'return'
  | 'payment'
  | 'bank_record'
  | 'cash_session'

export interface EntityRef<K extends string = EntityKind | DocumentKind> {
  kind: K
  id: number
  version: string // updated_at ISO con microsegundos
}

export type EntityStatus =
  | 'active'
  | 'inactive'
  | 'blocked'
  | 'pending'
  | 'overdue'
  | 'draft'
  | 'discontinued'

export interface Money {
  amount: number
  currency: 'COP'
}

// ── sobre ─────────────────────────────────────────────────────────────────────────
export interface RealtimeEnvelope<T extends RealtimeEventType = RealtimeEventType> {
  v: 1
  seq: number // 0 en los mensajes system.* que no salen de la BD
  id: string
  type: T
  occurredAt: string
  companyId: number | null
  warehouseIds: number[]
  actor: RealtimeActor
  correlationId?: string
  data: RealtimeEventMap[T]
}

// ── A · sistema ───────────────────────────────────────────────────────────────────
export interface WelcomeData {
  currentSeq: number
  channels: string[]
  heartbeatSec: number
  contractVersion: 1
}
export interface ReplayCompletedData {
  fromSeq: number
  toSeq: number
  count: number
}
export interface ResyncRequiredData {
  reason: 'gap_too_large' | 'contract_changed' | 'backup_restored'
  currentSeq: number
}
export interface WatermarkData {
  seq: number
}

// ── B · sesión y acceso ───────────────────────────────────────────────────────────
export interface SessionRevokedData {
  sessionId: number | null
  exceptSessionId: number | null
  reason: 'logout' | 'password_changed' | 'account_inactive' | 'company_inactive' | 'warehouse_inactive'
}
export interface PermissionsChangedData {
  actorType: ActorKind
  actorId: number
  permissions: string[]
}
export interface AccountUpdatedData {
  user: Record<string, unknown>
  version: string
}

// ── C · datos maestros ────────────────────────────────────────────────────────────
export interface EntityCreatedData<R = Record<string, unknown>> {
  entity: EntityRef<EntityKind>
  row: R
}
export interface EntityUpdatedData<R = Record<string, unknown>> {
  entity: EntityRef<EntityKind>
  row: R
  changedFields: string[]
}
export interface EntityStatusChangedData<R = Record<string, unknown>> {
  entity: EntityRef<EntityKind>
  from: EntityStatus
  to: EntityStatus
  reason: string | null
  row: R
}
export interface EntityArchivedData {
  entity: EntityRef<EntityKind>
  reason: string
  recycleBinId: number
}
export interface EntityRestoredData<R = Record<string, unknown>> {
  entity: EntityRef<EntityKind>
  row: R
  recycleBinId: number
  restoredBy: RealtimeActor
}
export interface EntityDeletedData {
  entity: EntityRef<EntityKind>
  parent: { kind: EntityKind; id: number } | null
}

// ── D · precios ───────────────────────────────────────────────────────────────────
export interface ProductPricesChangedData {
  productId: number
  prices: { p1: number; p2: number; p3: number; p4: number }
  ivaRate: number
  version: string
}

// ── E · inventario ────────────────────────────────────────────────────────────────
export type StockCause =
  | 'sale_out'
  | 'transfer_out'
  | 'transfer_in'
  | 'purchase_in'
  | 'return_in'
  | 'adjustment'
  | 'count_adjust'
  | 'reservation'
  | 'release'
  | 'relocation'

export interface StockRowChange {
  stockId: number
  productId: number
  productCode: string
  warehouseId: number
  location: string
  available: number
  reserved: number
  sellable: number
  minStock: number
  lowStock: boolean
  version: string
}
export interface StockTotal {
  productId: number
  warehouseId: number
  available: number
  reserved: number
  sellable: number
}
export interface StockChangedData {
  cause: {
    type: StockCause
    referenceType: 'sale' | 'transfer' | 'purchase' | 'return' | 'count' | 'manual' | null
    referenceId: number | null
    referenceSerial: string | null
  }
  rows: StockRowChange[]
  totals: StockTotal[]
}

export type TransferStatus = 'pending' | 'in_transit' | 'received' | 'with_novelty' | 'cancelled'
export interface TransferLine {
  lineId: number
  productId: number
  productCode: string
  productName: string
  quantity: number
  receivedQty: number
  destinationLocation: string
}
export interface TransferRow {
  id: number
  serial: string
  status: TransferStatus
  isPriority: boolean
  notes: string | null
  originWarehouseId: number
  destinationWarehouseId: number
  lines: TransferLine[]
  createdBy: RealtimeActor
  createdAt: string
  version: string
}
export interface TransferCreatedData {
  transfer: TransferRow
}
export interface TransferStatusChangedData {
  entity: EntityRef<'transfer'>
  serial: string
  from: TransferStatus
  to: TransferStatus
  originWarehouseId: number
  destinationWarehouseId: number
  lines: TransferLine[]
  noveltyNotes: string | null
  cancelReason: string | null
  dispatchedBy: RealtimeActor | null
  receivedBy: RealtimeActor | null
}

export type CountStatus = 'pending' | 'verified' | 'corroborated'
export interface CountItem {
  productId: number
  productCode: string
  location: string
  expectedQty: number
  countedQty: number | null
  stockId?: number // fila de stock contada (aditivo, 12-nov-2026)
  productName?: string
}
export interface CountCreatedData {
  count: {
    id: number
    serial: string | null
    warehouseId: number
    status: CountStatus
    items: CountItem[]
    version: string
    warehouseName?: string // aditivo, 12-nov-2026
  }
}
export interface CountProgressChangedData {
  entity: EntityRef<'count'>
  items: CountItem[]
  countedLines: number
  totalLines: number
}
export interface CountStatusChangedData {
  entity: EntityRef<'count'>
  from: CountStatus
  to: CountStatus
  differences: Array<{ productId: number; location: string; expectedQty: number; countedQty: number }>
}

// ── F · ventas ────────────────────────────────────────────────────────────────────
export interface CartUpdatedData {
  cart: Record<string, unknown>
}

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted'
export interface QuotationCreatedData {
  quotation: Record<string, unknown>
}
export interface QuotationUpdatedData {
  entity: EntityRef<'quotation'>
  row: Record<string, unknown>
  changedFields: string[]
}
export interface QuotationStatusChangedData {
  entity: EntityRef<'quotation'>
  from: QuotationStatus
  to: QuotationStatus
  saleId: number | null
}

export type SaleStage =
  | 'verification'
  | 'verification_ok'
  | 'picking'
  | 'picking_ok'
  | 'packing'
  | 'packing_ok'
  | 'invoicing'
  | 'invoicing_ok'
  | 'dispatch'
  | 'sent'
  | 'cancelled'
export type SaleStatus = 'open' | 'completed' | 'cancelled'
export interface SaleCreatedData {
  sale: Record<string, unknown>
}
export interface SaleStageChangedData {
  entity: EntityRef<'sale'>
  serial: string
  from: SaleStage
  to: SaleStage
  status: SaleStatus
  reason: string | null
  takenBy: RealtimeActor | null
}
export interface SalePaymentChangedData {
  saleId: number
  paidTotal: number
  creditAmount: number
  balance: number
  paymentVerified: boolean
  version: string
}
export interface InvoiceIssuedData {
  invoice: {
    id: number
    saleId: number
    serial: string
    dianNumber: string | null
    total: number
    status: 'issued'
    version: string
  }
}
export interface InvoiceAnnulledData {
  entity: EntityRef<'invoice'>
  saleId: number
  reason: string
}

// ── G · pagos, cartera y conciliación ─────────────────────────────────────────────
export type PaymentStatus = 'review' | 'verified' | 'issue' | 'voided'
export interface PaymentCreatedData {
  payment: Record<string, unknown>
}
export interface PaymentStatusChangedData {
  entity: EntityRef<'payment'>
  from: PaymentStatus
  to: PaymentStatus
  reason: string | null
}
export interface CreditBalanceChangedData {
  customerId: number
  creditLimit: number
  used: number
  available: number
  favorBalance: number
  status: 'ok' | 'warning' | 'blocked'
  entry: {
    type: 'charge' | 'payment' | 'return' | 'adjust'
    amount: number
    referenceType: string | null
    referenceId: number | null
  } | null
  version: string
}
export interface BankStatementImportedData {
  statementId: number
  bank: string
  recordsCreated: number
  period: { from: string; to: string } | null
}
export type BankRecordStatus = 'pending' | 'confirmed' | 'ignored'
export interface BankRecordStatusChangedData {
  entity: EntityRef<'bank_record'>
  from: BankRecordStatus
  to: BankRecordStatus
  paymentId: number | null
}

// ── H · caja ──────────────────────────────────────────────────────────────────────
export interface CashTotals {
  cashIn: number
  transferIn: number
  expenses: number
  expectedCash: number
}
export interface CashSessionStatusChangedData {
  entity: EntityRef<'cash_session'>
  from: 'open' | 'closed' | null
  to: 'open' | 'closed'
  openedBy: RealtimeActor | null
  closedBy: RealtimeActor | null
  totals: CashTotals
}
export interface CashSessionTotalsChangedData extends CashTotals {
  sessionId: number
  abonosIn?: number // pagos de ventas a crédito recibidos en el turno (aditivo, 12-nov-2026)
  paymentsCount?: number // pagos del turno sin los anulados
  version: string
}
export type CashExpenseType =
  | 'merchandise_arrival'
  | 'payroll'
  | 'loans'
  | 'overtime'
  | 'cleaning_supplies'
  | 'services'
  | 'other'
export interface CashExpenseRecordedData {
  expense: {
    id: number
    sessionId: number
    expenseType: CashExpenseType
    cashAmount: number
    transferAmount: number
    concept: string
    referenceType: string | null
    referenceId: number | null
  }
}

// ── I · compras ───────────────────────────────────────────────────────────────────
export type PurchaseStatus = 'draft' | 'ordered' | 'partial' | 'received' | 'voided'
export interface PurchaseCreatedData {
  purchase: Record<string, unknown>
}
export interface PurchaseStatusChangedData {
  entity: EntityRef<'purchase'>
  from: PurchaseStatus
  to: PurchaseStatus
  lines: Array<{ productId: number; ordered: number; received: number }>
  reason: string | null
}
export interface PurchasePaymentRecordedData {
  purchaseId: number
  paid: number
  balance: number
  cashAmount: number
  transferAmount: number
}
export interface SupplierCatalogImportedData {
  supplierId: number
  linked: number
  warnings: string[]
}

// ── J · devoluciones ──────────────────────────────────────────────────────────────
export type ReturnStatus = 'pending' | 'approved' | 'rejected'
export interface ReturnCreatedData {
  return: Record<string, unknown>
}
export interface ReturnStatusChangedData {
  entity: EntityRef<'return'>
  from: ReturnStatus
  to: ReturnStatus
  resolution: 'exchange' | 'credit_balance'
  rejectReason: string | null
}

// ── K · notificaciones, auditoría y respaldos ────────────────────────────────────
export interface NotificationCreatedData {
  notificationId: number
  kind: 'info' | 'success' | 'warning' | 'error' | 'restore_record'
  title: string
  message: string
  link: { module: string; subitem: string; entity?: { kind: string; id: number } } | null
}
export interface NotificationReadData {
  ids: number[] | 'all'
}
export interface AuditLoggedData {
  auditId: number
  entity: string
  entityId: number | null
  action: string
  actor: RealtimeActor
  reason: string | null
}
export interface BackupCreatedData {
  backup: { id: string; kind: string; sizeBytes: number; createdAt: string }
}
export interface BackupRestoredData {
  backupId: string
}

// ── mapa tipo → cuerpo (unión discriminada) ───────────────────────────────────────
export interface RealtimeEventMap {
  'system.welcome': WelcomeData
  'system.replay_completed': ReplayCompletedData
  'system.resync_required': ResyncRequiredData
  'system.watermark': WatermarkData
  'session.revoked': SessionRevokedData
  'permissions.changed': PermissionsChangedData
  'account.updated': AccountUpdatedData
  'entity.created': EntityCreatedData
  'entity.updated': EntityUpdatedData
  'entity.status_changed': EntityStatusChangedData
  'entity.archived': EntityArchivedData
  'entity.restored': EntityRestoredData
  'entity.deleted': EntityDeletedData
  'product.prices_changed': ProductPricesChangedData
  'stock.changed': StockChangedData
  'transfer.created': TransferCreatedData
  'transfer.status_changed': TransferStatusChangedData
  'count.created': CountCreatedData
  'count.progress_changed': CountProgressChangedData
  'count.status_changed': CountStatusChangedData
  'cart.updated': CartUpdatedData
  'quotation.created': QuotationCreatedData
  'quotation.updated': QuotationUpdatedData
  'quotation.status_changed': QuotationStatusChangedData
  'sale.created': SaleCreatedData
  'sale.stage_changed': SaleStageChangedData
  'sale.payment_changed': SalePaymentChangedData
  'invoice.issued': InvoiceIssuedData
  'invoice.annulled': InvoiceAnnulledData
  'payment.created': PaymentCreatedData
  'payment.status_changed': PaymentStatusChangedData
  'credit.balance_changed': CreditBalanceChangedData
  'bank_statement.imported': BankStatementImportedData
  'bank_record.status_changed': BankRecordStatusChangedData
  'cash_session.status_changed': CashSessionStatusChangedData
  'cash_session.totals_changed': CashSessionTotalsChangedData
  'cash.expense_recorded': CashExpenseRecordedData
  'purchase.created': PurchaseCreatedData
  'purchase.status_changed': PurchaseStatusChangedData
  'purchase.payment_recorded': PurchasePaymentRecordedData
  'supplier_catalog.imported': SupplierCatalogImportedData
  'return.created': ReturnCreatedData
  'return.status_changed': ReturnStatusChangedData
  'notification.created': NotificationCreatedData
  'notification.read': NotificationReadData
  'audit.logged': AuditLoggedData
  'backup.created': BackupCreatedData
  'backup.restored': BackupRestoredData
}

export type RealtimeEventType = keyof RealtimeEventMap // 48 tipos
export type RealtimeEvent = { [K in RealtimeEventType]: RealtimeEnvelope<K> }[RealtimeEventType]

// Lista de los 48 tipos del contrato v1 para validación en tiempo de ejecución
export const REALTIME_EVENT_TYPE_LIST: readonly RealtimeEventType[] = [
  'system.welcome',
  'system.replay_completed',
  'system.resync_required',
  'system.watermark',
  'session.revoked',
  'permissions.changed',
  'account.updated',
  'entity.created',
  'entity.updated',
  'entity.status_changed',
  'entity.archived',
  'entity.restored',
  'entity.deleted',
  'product.prices_changed',
  'stock.changed',
  'transfer.created',
  'transfer.status_changed',
  'count.created',
  'count.progress_changed',
  'count.status_changed',
  'cart.updated',
  'quotation.created',
  'quotation.updated',
  'quotation.status_changed',
  'sale.created',
  'sale.stage_changed',
  'sale.payment_changed',
  'invoice.issued',
  'invoice.annulled',
  'payment.created',
  'payment.status_changed',
  'credit.balance_changed',
  'bank_statement.imported',
  'bank_record.status_changed',
  'cash_session.status_changed',
  'cash_session.totals_changed',
  'cash.expense_recorded',
  'purchase.created',
  'purchase.status_changed',
  'purchase.payment_recorded',
  'supplier_catalog.imported',
  'return.created',
  'return.status_changed',
  'notification.created',
  'notification.read',
  'audit.logged',
  'backup.created',
  'backup.restored',
] as const

// ── mensajes del cliente al servidor (los únicos permitidos) ──────────────────────
export type ClientMessage =
  | { type: 'hello'; v: 1; lastSeq: number | null }
  | { type: 'pong'; ts: number }

// ── códigos de cierre del socket (los usa el front para decidir qué hacer) ────────
export const REALTIME_CLOSE_CODES = {
  normal: 1000,
  serverShutdown: 1001, // reconectar con espera
  ticketInvalid: 4001, // pedir ticket nuevo y reconectar
  originRejected: 4003, // no reconectar; error de configuración
  sessionRevoked: 4401, // cerrar sesión en el front
  queueOverflow: 4408, // reconectar y recuperar por seq
  protocolError: 4400, // mensaje inválido del cliente
  pingTimeout: 1011, // reconectar
  accountUnavailable: 4403, // cerrar sesión con el aviso de cuenta no disponible
  tooManyConnections: 4429, // no reconectar en esta pestaña
} as const

