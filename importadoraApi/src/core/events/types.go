package events

// types.go · contrato v1 de los eventos de tiempo real que la API escribe en realtime_events: tipos, kinds, sobre y un cuerpo por tipo
// conecta con: catalog.go (canal y permisos por tipo), constructors.go (arman cada Event), recorder.go (Record/Stock) y los servicios (los usan)
// ojo: debe coincidir campo por campo con importadoraRealtime/contract (JSON Schema); contract_test.go decodifica los 48 ejemplos de allí en estos structs

import "time"

// Type es el nombre del evento («dominio.hecho_en_pasado»).
type Type string

// A · sistema: los genera importadoraRealtime, no la API (se listan para que el catálogo esté completo)
const (
	SystemWelcome         Type = "system.welcome"
	SystemReplayCompleted Type = "system.replay_completed"
	SystemResyncRequired  Type = "system.resync_required"
	SystemWatermark       Type = "system.watermark"
)

// B · sesión y acceso
const (
	SessionRevoked     Type = "session.revoked"
	PermissionsChanged Type = "permissions.changed"
	AccountUpdated     Type = "account.updated"
)

// C · datos maestros genéricos
const (
	EntityCreated       Type = "entity.created"
	EntityUpdated       Type = "entity.updated"
	EntityStatusChanged Type = "entity.status_changed"
	EntityArchived      Type = "entity.archived"
	EntityRestored      Type = "entity.restored"
	EntityDeleted       Type = "entity.deleted"
)

// D a K · dominios con flujo propio
const (
	ProductPricesChanged     Type = "product.prices_changed"
	StockChanged             Type = "stock.changed"
	TransferCreated          Type = "transfer.created"
	TransferStatusChanged    Type = "transfer.status_changed"
	CountCreated             Type = "count.created"
	CountProgressChanged     Type = "count.progress_changed"
	CountStatusChanged       Type = "count.status_changed"
	CartUpdated              Type = "cart.updated"
	QuotationCreated         Type = "quotation.created"
	QuotationUpdated         Type = "quotation.updated"
	QuotationStatusChanged   Type = "quotation.status_changed"
	SaleCreated              Type = "sale.created"
	SaleStageChanged         Type = "sale.stage_changed"
	SalePaymentChanged       Type = "sale.payment_changed"
	InvoiceIssued            Type = "invoice.issued"
	InvoiceAnnulled          Type = "invoice.annulled"
	PaymentCreated           Type = "payment.created"
	PaymentStatusChanged     Type = "payment.status_changed"
	CreditBalanceChanged     Type = "credit.balance_changed"
	BankStatementImported    Type = "bank_statement.imported"
	BankRecordStatusChanged  Type = "bank_record.status_changed"
	CashSessionStatusChanged Type = "cash_session.status_changed"
	CashSessionTotalsChanged Type = "cash_session.totals_changed"
	CashExpenseRecorded      Type = "cash.expense_recorded"
	PurchaseCreated          Type = "purchase.created"
	PurchaseStatusChanged    Type = "purchase.status_changed"
	PurchasePaymentRecorded  Type = "purchase.payment_recorded"
	SupplierCatalogImported  Type = "supplier_catalog.imported"
	ReturnCreated            Type = "return.created"
	ReturnStatusChanged      Type = "return.status_changed"
	NotificationCreated      Type = "notification.created"
	NotificationRead         Type = "notification.read"
	AuditLogged              Type = "audit.logged"
	BackupCreated            Type = "backup.created"
	BackupRestored           Type = "backup.restored"
)

// Kind: entidades de datos maestros (para entity.*) y documentos (para EntityRef)
type Kind string

// datos maestros (19): cada uno con sus permisos de lectura en catalog.go
const (
	KindCompany             Kind = "company"
	KindAdmin               Kind = "admin"
	KindWarehouse           Kind = "warehouse"
	KindWarehouseBilling    Kind = "warehouse_billing"
	KindDocSeries           Kind = "doc_series"
	KindLocation            Kind = "location"
	KindCustomer            Kind = "customer"
	KindCustomerDocument    Kind = "customer_document"
	KindSupplier            Kind = "supplier"
	KindCarrier             Kind = "carrier"
	KindBrand               Kind = "brand"
	KindCategory            Kind = "category"
	KindModel               Kind = "model"
	KindProduct             Kind = "product"
	KindProductCode         Kind = "product_code"
	KindProductSupplier     Kind = "product_supplier"
	KindRole                Kind = "role"
	KindEmployee            Kind = "employee"
	KindScreensaverSettings Kind = "screensaver_settings"
)

// documentos con flujo propio (van en EntityRef de sus eventos)
const (
	KindSale        Kind = "sale"
	KindInvoice     Kind = "invoice"
	KindQuotation   Kind = "quotation"
	KindTransfer    Kind = "transfer"
	KindCount       Kind = "count"
	KindPurchase    Kind = "purchase"
	KindReturn      Kind = "return"
	KindPayment     Kind = "payment"
	KindBankRecord  Kind = "bank_record"
	KindCashSession Kind = "cash_session"
)

// Actor es quién hizo el cambio (employee | admin | superadmin | system).
type Actor struct {
	Type string `json:"type"`
	ID   *int64 `json:"id"`
	Name string `json:"name"`
}

// EntityRef identifica la fila y su versión (updated_at con microsegundos).
type EntityRef struct {
	Kind    Kind      `json:"kind"`
	ID      int64     `json:"id"`
	Version time.Time `json:"version"`
}

// Event lo arma un constructor dentro de la transacción; seq, id y occurredAt los pone la BD al guardarlo.
// ojo: los servicios nunca arman Event{} a mano: usan los constructores de constructors.go, que aplican el canal y los permisos del catálogo
type Event struct {
	Type          Type
	CompanyID     *int64
	WarehouseIDs  []int64
	ActorChannel  string   // "employee:12"; vacío si no es personal
	Platform      bool     // true: también al canal platform (superadmins)
	Permissions   []string // basta con UNO; vacío = cualquiera del canal
	CorrelationID string   // id de la petición HTTP; lo completa el buffer
	Data          any      // uno de los *Data de abajo; se guarda como JSONB en payload
}

// ── A · sistema (los arma importadoraRealtime; aquí solo para la prueba de contrato) ──

type WelcomeData struct {
	CurrentSeq      int64    `json:"currentSeq"`
	Channels        []string `json:"channels"`
	HeartbeatSec    int      `json:"heartbeatSec"`
	ContractVersion int      `json:"contractVersion"`
}
type ReplayCompletedData struct {
	FromSeq int64 `json:"fromSeq"`
	ToSeq   int64 `json:"toSeq"`
	Count   int   `json:"count"`
}
type ResyncRequiredData struct {
	Reason     string `json:"reason"`
	CurrentSeq int64  `json:"currentSeq"`
}
type WatermarkData struct {
	Seq int64 `json:"seq"`
}

// ── B · sesión y acceso ──

type SessionRevokedData struct {
	SessionID       *int64 `json:"sessionId"`
	ExceptSessionID *int64 `json:"exceptSessionId"` // sesión que sigue viva (la que cambió su clave con PUT /auth/me/password)
	Reason          string `json:"reason"`          // logout | password_changed | account_inactive | company_inactive | warehouse_inactive
}
type PermissionsChangedData struct {
	ActorType   string   `json:"actorType"`
	ActorID     int64    `json:"actorId"`
	Permissions []string `json:"permissions"`
}
type AccountUpdatedData struct {
	User    any       `json:"user"` // forma de GET /auth/me
	Version time.Time `json:"version"`
}

// ── C · datos maestros ──

type EntityCreatedData struct {
	Entity EntityRef `json:"entity"`
	Row    any       `json:"row"` // el DTO de GET /:id de esa entidad
}
type EntityUpdatedData struct {
	Entity        EntityRef `json:"entity"`
	Row           any       `json:"row"`
	ChangedFields []string  `json:"changedFields"`
}
type EntityStatusChangedData struct {
	Entity EntityRef `json:"entity"`
	From   string    `json:"from"` // active | inactive | blocked | pending | overdue | draft | discontinued
	To     string    `json:"to"`
	Reason *string   `json:"reason"`
	Row    any       `json:"row"`
}
type EntityArchivedData struct {
	Entity       EntityRef `json:"entity"`
	Reason       string    `json:"reason"`
	RecycleBinID int64     `json:"recycleBinId"`
}
type EntityRestoredData struct {
	Entity       EntityRef `json:"entity"`
	Row          any       `json:"row"`
	RecycleBinID int64     `json:"recycleBinId"`
	RestoredBy   Actor     `json:"restoredBy"`
}
type EntityParent struct {
	Kind Kind  `json:"kind"`
	ID   int64 `json:"id"`
}
type EntityDeletedData struct {
	Entity EntityRef     `json:"entity"`
	Parent *EntityParent `json:"parent"`
}

// ── D · precios ──

type TierPrices struct {
	P1 float64 `json:"p1"`
	P2 float64 `json:"p2"`
	P3 float64 `json:"p3"`
	P4 float64 `json:"p4"`
}
type ProductPricesChangedData struct {
	ProductID int64      `json:"productId"`
	Prices    TierPrices `json:"prices"`
	IvaRate   float64    `json:"ivaRate"`
	Version   time.Time  `json:"version"`
}

// ── E · inventario ──

// StockCause dice por qué cambió el stock y qué documento lo causó.
type StockCause struct {
	Type            string  `json:"type"` // sale_out | transfer_out | transfer_in | purchase_in | return_in | adjustment | count_adjust | reservation | release | relocation
	ReferenceType   *string `json:"referenceType"`
	ReferenceID     *int64  `json:"referenceId"`
	ReferenceSerial *string `json:"referenceSerial"`
}

// StockRow es una fila de stock con sus valores FINALES (no deltas).
type StockRow struct {
	StockID     int64     `json:"stockId"`
	ProductID   int64     `json:"productId"`
	ProductCode string    `json:"productCode"`
	WarehouseID int64     `json:"warehouseId"`
	Location    string    `json:"location"`
	Available   int       `json:"available"`
	Reserved    int       `json:"reserved"`
	Sellable    int       `json:"sellable"`
	MinStock    int       `json:"minStock"`
	LowStock    bool      `json:"lowStock"`
	Version     time.Time `json:"version"`
}
type StockTotal struct {
	ProductID   int64 `json:"productId"`
	WarehouseID int64 `json:"warehouseId"`
	Available   int   `json:"available"`
	Reserved    int   `json:"reserved"`
	Sellable    int   `json:"sellable"`
}
type StockChangedData struct {
	Cause  StockCause   `json:"cause"`
	Rows   []StockRow   `json:"rows"` // máximo 200 por mensaje
	Totals []StockTotal `json:"totals"`
}

type TransferLine struct {
	LineID              int64  `json:"lineId"`
	ProductID           int64  `json:"productId"`
	ProductCode         string `json:"productCode"`
	ProductName         string `json:"productName"`
	Quantity            int    `json:"quantity"`
	ReceivedQty         int    `json:"receivedQty"`
	DestinationLocation string `json:"destinationLocation"`
}
type TransferRow struct {
	ID                     int64          `json:"id"`
	Serial                 string         `json:"serial"`
	Status                 string         `json:"status"` // pending | in_transit | received | with_novelty | cancelled
	IsPriority             bool           `json:"isPriority"`
	Notes                  *string        `json:"notes"`
	OriginWarehouseID      int64          `json:"originWarehouseId"`
	DestinationWarehouseID int64          `json:"destinationWarehouseId"`
	Lines                  []TransferLine `json:"lines"`
	CreatedBy              Actor          `json:"createdBy"`
	CreatedAt              time.Time      `json:"createdAt"`
	Version                time.Time      `json:"version"`
}
type TransferCreatedData struct {
	Transfer TransferRow `json:"transfer"`
}
type TransferStatusChangedData struct {
	Entity                 EntityRef      `json:"entity"`
	Serial                 string         `json:"serial"`
	From                   string         `json:"from"`
	To                     string         `json:"to"`
	OriginWarehouseID      int64          `json:"originWarehouseId"`
	DestinationWarehouseID int64          `json:"destinationWarehouseId"`
	Lines                  []TransferLine `json:"lines"`
	NoveltyNotes           *string        `json:"noveltyNotes"`
	CancelReason           *string        `json:"cancelReason"`
	DispatchedBy           *Actor         `json:"dispatchedBy"`
	ReceivedBy             *Actor         `json:"receivedBy"`
}

type CountItem struct {
	ProductID   int64  `json:"productId"`
	ProductCode string `json:"productCode"`
	Location    string `json:"location"`
	ExpectedQty int    `json:"expectedQty"`
	CountedQty  *int   `json:"countedQty"`
	StockID     *int64 `json:"stockId,omitempty"`     // fila de stock contada (aditivo, 12-nov-2026): la pantalla de conteos se guía por ella
	ProductName string `json:"productName,omitempty"` // nombre del producto (aditivo)
}
type CountRow struct {
	ID            int64       `json:"id"`
	Serial        *string     `json:"serial"`
	WarehouseID   int64       `json:"warehouseId"`
	Status        string      `json:"status"` // pending | verified | corroborated
	Items         []CountItem `json:"items"`
	Version       time.Time   `json:"version"`
	WarehouseName string      `json:"warehouseName,omitempty"` // nombre de la bodega (aditivo, 12-nov-2026)
}
type CountCreatedData struct {
	Count CountRow `json:"count"`
}
type CountProgressChangedData struct {
	Entity       EntityRef   `json:"entity"`
	Items        []CountItem `json:"items"`
	CountedLines int         `json:"countedLines"`
	TotalLines   int         `json:"totalLines"`
}
type CountDifference struct {
	ProductID   int64  `json:"productId"`
	Location    string `json:"location"`
	ExpectedQty int    `json:"expectedQty"`
	CountedQty  int    `json:"countedQty"`
}
type CountStatusChangedData struct {
	Entity      EntityRef         `json:"entity"`
	From        string            `json:"from"`
	To          string            `json:"to"`
	Differences []CountDifference `json:"differences"`
}

// ── F · ventas ──

type CartUpdatedData struct {
	Cart any `json:"cart"` // forma de la respuesta del carrito
}
type QuotationCreatedData struct {
	Quotation any `json:"quotation"`
}
type QuotationUpdatedData struct {
	Entity        EntityRef `json:"entity"`
	Row           any       `json:"row"`
	ChangedFields []string  `json:"changedFields"`
}
type QuotationStatusChangedData struct {
	Entity EntityRef `json:"entity"`
	From   string    `json:"from"` // draft | sent | accepted | rejected | expired | converted
	To     string    `json:"to"`
	SaleID *int64    `json:"saleId"`
}
type SaleCreatedData struct {
	Sale any `json:"sale"` // forma de la fila de la tabla de pedidos
}
type SaleStageChangedData struct {
	Entity  EntityRef `json:"entity"`
	Serial  string    `json:"serial"`
	From    string    `json:"from"`
	To      string    `json:"to"`
	Status  string    `json:"status"` // open | completed | cancelled
	Reason  *string   `json:"reason"`
	TakenBy *Actor    `json:"takenBy"`
}
type SalePaymentChangedData struct {
	SaleID          int64     `json:"saleId"`
	PaidTotal       float64   `json:"paidTotal"`
	CreditAmount    float64   `json:"creditAmount"`
	Balance         float64   `json:"balance"`
	PaymentVerified bool      `json:"paymentVerified"`
	Version         time.Time `json:"version"`
}
type InvoiceRow struct {
	ID         int64     `json:"id"`
	SaleID     int64     `json:"saleId"`
	Serial     string    `json:"serial"`
	DianNumber *string   `json:"dianNumber"`
	Total      float64   `json:"total"`
	Status     string    `json:"status"` // issued
	Version    time.Time `json:"version"`
}
type InvoiceIssuedData struct {
	Invoice InvoiceRow `json:"invoice"`
}
type InvoiceAnnulledData struct {
	Entity EntityRef `json:"entity"`
	SaleID int64     `json:"saleId"`
	Reason string    `json:"reason"`
}

// ── G · pagos, cartera y conciliación ──

type PaymentCreatedData struct {
	Payment any `json:"payment"` // forma de la fila de Abonos
}
type PaymentStatusChangedData struct {
	Entity EntityRef `json:"entity"`
	From   string    `json:"from"` // review | verified | issue | voided
	To     string    `json:"to"`
	Reason *string   `json:"reason"`
}
type CreditEntryRef struct {
	Type          string  `json:"type"` // charge | payment | return | adjust
	Amount        float64 `json:"amount"`
	ReferenceType *string `json:"referenceType"`
	ReferenceID   *int64  `json:"referenceId"`
}
type CreditBalanceChangedData struct {
	CustomerID   int64           `json:"customerId"`
	CreditLimit  float64         `json:"creditLimit"`
	Used         float64         `json:"used"`
	Available    float64         `json:"available"`
	FavorBalance float64         `json:"favorBalance"`
	Status       string          `json:"status"` // ok | warning | blocked
	Entry        *CreditEntryRef `json:"entry"`
	Version      time.Time       `json:"version"`
}
type Period struct {
	From string `json:"from"`
	To   string `json:"to"`
}
type BankStatementImportedData struct {
	StatementID    int64   `json:"statementId"`
	Bank           string  `json:"bank"`
	RecordsCreated int     `json:"recordsCreated"`
	Period         *Period `json:"period"`
}
type BankRecordStatusChangedData struct {
	Entity    EntityRef `json:"entity"`
	From      string    `json:"from"` // pending | confirmed | ignored
	To        string    `json:"to"`
	PaymentID *int64    `json:"paymentId"`
}

// ── H · caja ──

type CashTotals struct {
	CashIn       float64 `json:"cashIn"`
	TransferIn   float64 `json:"transferIn"`
	Expenses     float64 `json:"expenses"`
	ExpectedCash float64 `json:"expectedCash"`
}
type CashSessionStatusChangedData struct {
	Entity   EntityRef  `json:"entity"`
	From     *string    `json:"from"` // open | closed | null (al abrir)
	To       string     `json:"to"`
	OpenedBy *Actor     `json:"openedBy"`
	ClosedBy *Actor     `json:"closedBy"`
	Totals   CashTotals `json:"totals"`
}
type CashSessionTotalsChangedData struct {
	SessionID     int64     `json:"sessionId"`
	CashIn        float64   `json:"cashIn"`
	TransferIn    float64   `json:"transferIn"`
	AbonosIn      float64   `json:"abonosIn"`      // pagos de ventas a crédito recibidos en el turno
	PaymentsCount int       `json:"paymentsCount"` // pagos del turno sin los anulados
	Expenses      float64   `json:"expenses"`
	ExpectedCash  float64   `json:"expectedCash"`
	Version       time.Time `json:"version"`
}
type CashExpense struct {
	ID             int64   `json:"id"`
	SessionID      int64   `json:"sessionId"`
	ExpenseType    string  `json:"expenseType"` // merchandise_arrival | payroll | loans | overtime | cleaning_supplies | services | other
	CashAmount     float64 `json:"cashAmount"`
	TransferAmount float64 `json:"transferAmount"`
	Concept        string  `json:"concept"`
	ReferenceType  *string `json:"referenceType"`
	ReferenceID    *int64  `json:"referenceId"`
}
type CashExpenseRecordedData struct {
	Expense CashExpense `json:"expense"`
}

// ── I · compras ──

type PurchaseCreatedData struct {
	Purchase any `json:"purchase"`
}
type PurchaseLine struct {
	ProductID int64 `json:"productId"`
	Ordered   int   `json:"ordered"`
	Received  int   `json:"received"`
}
type PurchaseStatusChangedData struct {
	Entity EntityRef      `json:"entity"`
	From   string         `json:"from"` // draft | ordered | partial | received | voided
	To     string         `json:"to"`
	Lines  []PurchaseLine `json:"lines"`
	Reason *string        `json:"reason"`
}
type PurchasePaymentRecordedData struct {
	PurchaseID     int64   `json:"purchaseId"`
	Paid           float64 `json:"paid"`
	Balance        float64 `json:"balance"`
	CashAmount     float64 `json:"cashAmount"`
	TransferAmount float64 `json:"transferAmount"`
}
type SupplierCatalogImportedData struct {
	SupplierID int64    `json:"supplierId"`
	Linked     int      `json:"linked"`
	Warnings   []string `json:"warnings"`
}

// ── J · devoluciones ──

type ReturnCreatedData struct {
	Return any `json:"return"`
}
type ReturnStatusChangedData struct {
	Entity       EntityRef `json:"entity"`
	From         string    `json:"from"` // pending | approved | rejected
	To           string    `json:"to"`
	Resolution   string    `json:"resolution"` // exchange | credit_balance
	RejectReason *string   `json:"rejectReason"`
}

// ── K · notificaciones, auditoría y respaldos ──

type NotificationEntity struct {
	Kind string `json:"kind"`
	ID   int64  `json:"id"`
}
type NotificationLink struct {
	Module  string              `json:"module"`
	Subitem string              `json:"subitem"`
	Entity  *NotificationEntity `json:"entity,omitempty"`
}
type NotificationCreatedData struct {
	NotificationID int64             `json:"notificationId"`
	Kind           string            `json:"kind"` // info | success | warning | error | restore_record
	Title          string            `json:"title"`
	Message        string            `json:"message"`
	Link           *NotificationLink `json:"link"`
}

// NotificationReadData: Ids es una lista de ids o el texto "all".
type NotificationReadData struct {
	IDs any `json:"ids"`
}
type AuditLoggedData struct {
	AuditID  int64   `json:"auditId"`
	Entity   string  `json:"entity"`
	EntityID *int64  `json:"entityId"`
	Action   string  `json:"action"`
	Actor    Actor   `json:"actor"`
	Reason   *string `json:"reason"`
}
type BackupInfo struct {
	ID        string    `json:"id"`
	Kind      string    `json:"kind"`
	SizeBytes int64     `json:"sizeBytes"`
	CreatedAt time.Time `json:"createdAt"`
}
type BackupCreatedData struct {
	Backup BackupInfo `json:"backup"`
}
type BackupRestoredData struct {
	BackupID string `json:"backupId"`
}

// bodies relaciona cada tipo con un valor vacío de su cuerpo (lo usan las pruebas de contrato y de catálogo)
var bodies = map[Type]func() any{
	SystemWelcome: func() any { return &WelcomeData{} }, SystemReplayCompleted: func() any { return &ReplayCompletedData{} },
	SystemResyncRequired: func() any { return &ResyncRequiredData{} }, SystemWatermark: func() any { return &WatermarkData{} },
	SessionRevoked: func() any { return &SessionRevokedData{} }, PermissionsChanged: func() any { return &PermissionsChangedData{} },
	AccountUpdated: func() any { return &AccountUpdatedData{} },
	EntityCreated:  func() any { return &EntityCreatedData{} }, EntityUpdated: func() any { return &EntityUpdatedData{} },
	EntityStatusChanged: func() any { return &EntityStatusChangedData{} }, EntityArchived: func() any { return &EntityArchivedData{} },
	EntityRestored: func() any { return &EntityRestoredData{} }, EntityDeleted: func() any { return &EntityDeletedData{} },
	ProductPricesChanged: func() any { return &ProductPricesChangedData{} }, StockChanged: func() any { return &StockChangedData{} },
	TransferCreated: func() any { return &TransferCreatedData{} }, TransferStatusChanged: func() any { return &TransferStatusChangedData{} },
	CountCreated: func() any { return &CountCreatedData{} }, CountProgressChanged: func() any { return &CountProgressChangedData{} },
	CountStatusChanged: func() any { return &CountStatusChangedData{} }, CartUpdated: func() any { return &CartUpdatedData{} },
	QuotationCreated: func() any { return &QuotationCreatedData{} }, QuotationUpdated: func() any { return &QuotationUpdatedData{} },
	QuotationStatusChanged: func() any { return &QuotationStatusChangedData{} }, SaleCreated: func() any { return &SaleCreatedData{} },
	SaleStageChanged: func() any { return &SaleStageChangedData{} }, SalePaymentChanged: func() any { return &SalePaymentChangedData{} },
	InvoiceIssued: func() any { return &InvoiceIssuedData{} }, InvoiceAnnulled: func() any { return &InvoiceAnnulledData{} },
	PaymentCreated: func() any { return &PaymentCreatedData{} }, PaymentStatusChanged: func() any { return &PaymentStatusChangedData{} },
	CreditBalanceChanged: func() any { return &CreditBalanceChangedData{} }, BankStatementImported: func() any { return &BankStatementImportedData{} },
	BankRecordStatusChanged: func() any { return &BankRecordStatusChangedData{} }, CashSessionStatusChanged: func() any { return &CashSessionStatusChangedData{} },
	CashSessionTotalsChanged: func() any { return &CashSessionTotalsChangedData{} }, CashExpenseRecorded: func() any { return &CashExpenseRecordedData{} },
	PurchaseCreated: func() any { return &PurchaseCreatedData{} }, PurchaseStatusChanged: func() any { return &PurchaseStatusChangedData{} },
	PurchasePaymentRecorded: func() any { return &PurchasePaymentRecordedData{} }, SupplierCatalogImported: func() any { return &SupplierCatalogImportedData{} },
	ReturnCreated: func() any { return &ReturnCreatedData{} }, ReturnStatusChanged: func() any { return &ReturnStatusChangedData{} },
	NotificationCreated: func() any { return &NotificationCreatedData{} }, NotificationRead: func() any { return &NotificationReadData{} },
	AuditLogged: func() any { return &AuditLoggedData{} }, BackupCreated: func() any { return &BackupCreatedData{} },
	BackupRestored: func() any { return &BackupRestoredData{} },
}
