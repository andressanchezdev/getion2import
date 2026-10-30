package dtos

import (
	"time"

	"importadoraApi/src/core/types"
)

type CreditEntryResponse struct {
	ID            int64                 `json:"id"`
	CompanyID     int64                 `json:"companyId"`
	CustomerID    int64                 `json:"customerId"`
	CustomerName  string                `json:"customerName"`
	EmployeeID    *int64                `json:"employeeId,omitempty"`
	EmployeeName  *string               `json:"employeeName,omitempty"`
	EntryType     types.CreditEntryType `json:"entryType"`
	Amount        float64               `json:"amount"`
	SaleID        *int64                `json:"saleId,omitempty"`
	SaleSerial    *string               `json:"saleSerial,omitempty"`
	PaymentID     *int64                `json:"paymentId,omitempty"`
	PaymentSerial *string               `json:"paymentSerial,omitempty"`
	ReturnID      *int64                `json:"returnId,omitempty"`
	Reason        *string               `json:"reason,omitempty"`
	CreatedAt     time.Time             `json:"createdAt"`
}

type CustomerCreditSummaryResponse struct {
	CustomerID      int64   `json:"customerId"`
	CompanyID       int64   `json:"companyId"`
	Document        string  `json:"document"`
	CustomerName    string  `json:"customerName"`
	CreditEnabled   bool    `json:"creditEnabled"`
	CreditLimit     float64 `json:"creditLimit"`
	CreditDays      int16   `json:"creditDays"`
	CreditBalance   float64 `json:"creditBalance"`   // Positivo = saldo a favor; Negativo = saldo deudor
	ReservedOrders  float64 `json:"reservedOrders"`  // Pedidos abiertos a crédito pendientes de facturar
	AvailableCredit float64 `json:"availableCredit"` // Cupo disponible real para nuevas compras
}

type CreateCreditAdjustmentRequest struct {
	CustomerID int64   `json:"customerId" validate:"required"`
	Amount     float64 `json:"amount" validate:"required,ne=0"` // > 0 abono/favor, < 0 cargo
	Reason     string  `json:"reason" validate:"required"`
}

type CreditEntryFilterQuery struct {
	CompanyID  *int64
	CustomerID *int64
	EntryType  *types.CreditEntryType
	Page       int
	PageSize   int
}

