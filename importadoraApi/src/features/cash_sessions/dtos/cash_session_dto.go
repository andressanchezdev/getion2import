package dtos

// cash_session_dto.go · lo que entra y sale por la API de turnos de caja (/cash/sessions)
// conecta con: cash_session_controller (recibe y responde) y cash_session_service (arma las respuestas)

import "time"

type CashSessionResponse struct {
	ID                int64                `json:"id"`
	CompanyID         int64                `json:"companyId"`
	WarehouseID       int64                `json:"warehouseId"`
	WarehouseName     string               `json:"warehouseName,omitempty"`
	Status            string               `json:"status"` // "open" | "closed"
	OpenedByActorType string               `json:"openedByActorType"`
	OpenedByActorID   int64                `json:"openedByActorId"`
	OpenedByName      string               `json:"openedByName"`
	OpenedAt          time.Time            `json:"openedAt"`
	OpeningAmount     float64              `json:"openingAmount"`
	ClosedByActorType *string              `json:"closedByActorType,omitempty"`
	ClosedByActorID   *int64               `json:"closedByActorId,omitempty"`
	ClosedByName      *string              `json:"closedByName,omitempty"`
	ClosedAt          *time.Time           `json:"closedAt,omitempty"`
	CashTotal         float64              `json:"cashTotal"`     // ventas en efectivo verificadas del turno
	TransferTotal     float64              `json:"transferTotal"` // ventas por transferencia recibidas en el turno (verificadas o en revisión)
	AbonosTotal       float64              `json:"abonosTotal"`   // pagos de ventas a crédito recibidos en el turno
	PaymentsCount     int                  `json:"paymentsCount"`
	ExpensesCash      float64              `json:"expensesCash"` // gastos pagados en efectivo (solo al cerrar)
	ExpectedCash      float64              `json:"expectedCash"` // fondo + ventas en efectivo - gastos en efectivo
	CountedCash       *float64             `json:"countedCash,omitempty"`
	Difference        *float64             `json:"difference,omitempty"`         // contado - esperado
	CountedTransfer   *float64             `json:"countedTransfer,omitempty"`    // transferencias declaradas al cerrar
	TransferDiff      *float64             `json:"transferDifference,omitempty"` // declaradas - recibidas
	CountedAbonos     *float64             `json:"countedAbonos,omitempty"`      // abonos declarados al cerrar
	AbonosDiff        *float64             `json:"abonosDifference,omitempty"`   // declarados - recibidos
	Notes             *string              `json:"notes,omitempty"`
	Expenses          []CashExpenseRequest `json:"expenses,omitempty"`
}

type OpenCashSessionRequest struct {
	WarehouseID   int64   `json:"warehouseId"`
	OpeningAmount float64 `json:"openingAmount"`
}

// CashExpenseRequest es un gasto menor pagado desde la caja: recibo, concepto y cuánto salió en efectivo y por transferencia.
type CashExpenseRequest struct {
	ReceiptNumber  string  `json:"receiptNumber"`
	Concept        string  `json:"concept"`
	CashAmount     float64 `json:"cashAmount"`
	TransferAmount float64 `json:"transferAmount"`
}

type CloseCashSessionRequest struct {
	WarehouseID     int64                `json:"warehouseId"`
	CountedCash     float64              `json:"countedCash"`
	CountedTransfer *float64             `json:"countedTransfer,omitempty"` // transferencias que declara el cajero
	CountedAbonos   *float64             `json:"countedAbonos,omitempty"`   // abonos que declara el cajero (solo si hubo)
	Notes           *string              `json:"notes,omitempty"`
	Expenses        []CashExpenseRequest `json:"expenses,omitempty"`
}

// CashExpenseRow es un gasto de caja ya registrado (un pago de recepción de compra o un gasto menor declarado al cerrar): lo que lista «Facturas»
type CashExpenseRow struct {
	ID            int64     `json:"id"`
	SessionID     int64     `json:"sessionId"`
	WarehouseID   int64     `json:"warehouseId"`
	WarehouseName string    `json:"warehouseName"`
	ExpenseType   string    `json:"expenseType"` // merchandise_arrival (recepción de compra), services, payroll...
	ReceiptNumber *string   `json:"receiptNumber,omitempty"`
	Concept       string    `json:"concept"`
	CashAmount    float64   `json:"cashAmount"`
	Total         float64   `json:"total"`
	PurchaseID    *int64    `json:"purchaseId,omitempty"`
	PurchaseCode  *string   `json:"purchaseCode,omitempty"`
	SupplierName  *string   `json:"supplierName,omitempty"`
	PaidBy        string    `json:"paidBy"`   // quién abrió el turno de caja
	ClosedAt      time.Time `json:"closedAt"` // el gasto entra a Facturas cuando la caja cierra
}

// CashExpenseFilter filtra la lista de gastos de caja.
type CashExpenseFilter struct {
	CompanyID   *int64
	WarehouseID *int64
	From        *time.Time
	To          *time.Time
	Search      string
	Page        int
	PageSize    int
}
