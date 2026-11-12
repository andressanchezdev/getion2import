package dtos

// payment_dto.go · formas de lo que entra y sale por la API en pagos (peticiones y respuestas)
// conecta con: los controllers y services de pagos

import (
	"time"

	"importadoraApi/src/core/types"
)

type PaymentResponse struct {
	ID                   int64               `json:"id"`
	CompanyID            int64               `json:"companyId"`
	SerialCode           string              `json:"serialCode"`
	SaleID               int64               `json:"saleId"`
	SaleSerial           string              `json:"saleSerial"`
	CustomerID           int64               `json:"customerId"`
	CustomerName         string              `json:"customerName"`
	EmployeeID           int64               `json:"employeeId"`
	EmployeeName         string              `json:"employeeName"`
	VerifiedByEmployeeID *int64              `json:"verifiedByEmployeeId,omitempty"`
	VerifiedByName       *string             `json:"verifiedByName,omitempty"`
	Method               types.PaymentMethod `json:"method"`
	Amount               float64             `json:"amount"`
	Status               types.PaymentStatus `json:"status"`
	ProofURL             *string             `json:"proofUrl,omitempty"`
	Reference            *string             `json:"reference,omitempty"`
	IssueNote            *string             `json:"issueNote,omitempty"`
	VoidReason           *string             `json:"voidReason,omitempty"`
	VerifiedAt           *time.Time          `json:"verifiedAt,omitempty"`
	CreatedAt            time.Time           `json:"createdAt"`
	WarehouseID          int64               `json:"warehouseId"`
	WarehouseCode        string              `json:"warehouseCode"`
	WarehouseName        string              `json:"warehouseName"`
}

type CreatePaymentRequest struct {
	SaleID    int64               `json:"saleId" validate:"required"`
	Method    types.PaymentMethod `json:"method" validate:"required"`
	Amount    float64             `json:"amount" validate:"required,gt=0"`
	ProofURL  *string             `json:"proofUrl,omitempty"`
	Reference *string             `json:"reference,omitempty"`
	Notes     *string             `json:"notes,omitempty"`
}

type VerifyPaymentRequest struct {
	IssueNote *string `json:"issueNote,omitempty"`
}

// RejectPaymentRequest entrada de POST /payments/:id/reject: el motivo (10 a 100 caracteres).
type RejectPaymentRequest struct {
	Reason string `json:"reason"`
}

type VoidPaymentRequest struct {
	VoidReason string `json:"voidReason" validate:"required"`
}

type PaymentFilterQuery struct {
	WarehouseID *int64
	CompanyID   *int64
	SaleID      *int64
	CustomerID  *int64
	Status      *types.PaymentStatus
	Method      *types.PaymentMethod
	Search      string
	Page        int
	PageSize    int
}

// PaymentLineRequest es una línea de un cobro mixto: cuánto se paga y con qué método (efectivo, transferencia o crédito).
type PaymentLineRequest struct {
	Method    types.PaymentMethod `json:"method"`
	Amount    float64             `json:"amount"`
	Reference *string             `json:"reference,omitempty"` // transferencia: número del comprobante
	ProofURL  *string             `json:"proofUrl,omitempty"`  // transferencia: foto del comprobante
	Bank      *string             `json:"bank,omitempty"`      // transferencia: banco de origen
}

// CreatePaymentsRequest entrada para POST /payments/batch: todos los pagos de un pedido en una sola operación.
type CreatePaymentsRequest struct {
	SaleID   int64                `json:"saleId"`
	Payments []PaymentLineRequest `json:"payments"`
}

// PaymentsBatchResponse devuelve los pagos creados y cómo quedó el pedido.
type PaymentsBatchResponse struct {
	Payments     []PaymentResponse `json:"payments"`
	Stage        string            `json:"stage"`        // etapa del pedido después del cobro (verification_ok = pago confirmado)
	PaidTotal    float64           `json:"paidTotal"`    // pagos verificados
	CreditAmount float64           `json:"creditAmount"` // lo que quedó a crédito
	Balance      float64           `json:"balance"`      // lo que todavía falta por cubrir
}
