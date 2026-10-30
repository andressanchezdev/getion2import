package types

// CartStatus coincide con carts.status ('open' | 'converted' | 'abandoned').
type CartStatus string

const (
	CartOpen      CartStatus = "open"
	CartConverted CartStatus = "converted"
	CartAbandoned CartStatus = "abandoned"
)

// SaleStatus coincide con sales.status ('open' | 'completed' | 'cancelled').
type SaleStatus string

const (
	SaleOpen      SaleStatus = "open"
	SaleCompleted SaleStatus = "completed"
	SaleCancelled SaleStatus = "cancelled"
)

// ProcessStage coincide con sales.current_stage y sale_items.process_stage:
// Verificación -> Verificación exitosa -> Picking -> Picking exitoso ->
// Packing -> Packing exitoso -> Facturación -> Facturación exitosa -> Despacho -> Enviado.
type ProcessStage string

const (
	StageVerification   ProcessStage = "verification"
	StageVerificationOK ProcessStage = "verification_ok"
	StagePicking        ProcessStage = "picking"
	StagePickingOK      ProcessStage = "picking_ok"
	StagePacking        ProcessStage = "packing"
	StagePackingOK      ProcessStage = "packing_ok"
	StageInvoicing      ProcessStage = "invoicing"
	StageInvoicingOK    ProcessStage = "invoicing_ok"
	StageDispatch       ProcessStage = "dispatch"
	StageSent           ProcessStage = "sent"
	StageCancelled      ProcessStage = "cancelled"
)

// StageStatus coincide con sale_items.stage_status ('pending' | 'in_progress' | 'paused' | 'completed').
type StageStatus string

const (
	StageStatusPending    StageStatus = "pending"
	StageStatusInProgress StageStatus = "in_progress"
	StageStatusPaused     StageStatus = "paused"
	StageStatusCompleted  StageStatus = "completed"
)

// QuotationStatus coincide con quotations.status.
type QuotationStatus string

const (
	QuotationDraft     QuotationStatus = "draft"
	QuotationSent      QuotationStatus = "sent"
	QuotationAccepted  QuotationStatus = "accepted"
	QuotationRejected  QuotationStatus = "rejected"
	QuotationExpired   QuotationStatus = "expired"
	QuotationConverted QuotationStatus = "converted"
)

// ReturnStatus coincide con returns.status ('pending' | 'approved' | 'rejected').
type ReturnStatus string

const (
	ReturnPending  ReturnStatus = "pending"
	ReturnApproved ReturnStatus = "approved"
	ReturnRejected ReturnStatus = "rejected"
)

// ReturnReasonType coincide con returns.reason_type ('warranty' | 'wrong_item').
type ReturnReasonType string

const (
	ReturnReasonWarranty  ReturnReasonType = "warranty"
	ReturnReasonWrongItem ReturnReasonType = "wrong_item"
)

// ReturnResolutionType coincide con returns.resolution_type ('exchange' | 'credit_balance').
type ReturnResolutionType string

const (
	ReturnResolutionExchange ReturnResolutionType = "exchange"
	ReturnResolutionCredit   ReturnResolutionType = "credit_balance"
)

// InvoiceKind coincide con invoices.kind ('invoice' | 'credit_note').
type InvoiceKind string

const (
	InvoiceKindStandard   InvoiceKind = "invoice"
	InvoiceKindCreditNote InvoiceKind = "credit_note"
)

// InvoiceStatus coincide con invoices.status ('pending' | 'issued' | 'annulled').
type InvoiceStatus string

const (
	InvoiceStatusPending  InvoiceStatus = "pending"
	InvoiceStatusIssued   InvoiceStatus = "issued"
	InvoiceStatusAnnulled InvoiceStatus = "annulled"
)

