package dtos

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
}

type CreatePaymentRequest struct {
	SaleID     int64               `json:"saleId" validate:"required"`
	Method     types.PaymentMethod `json:"method" validate:"required"`
	Amount     float64             `json:"amount" validate:"required,gt=0"`
	ProofURL   *string             `json:"proofUrl,omitempty"`
	Reference  *string             `json:"reference,omitempty"`
	Notes      *string             `json:"notes,omitempty"`
}

type VerifyPaymentRequest struct {
	IssueNote *string `json:"issueNote,omitempty"`
}

type VoidPaymentRequest struct {
	VoidReason string `json:"voidReason" validate:"required"`
}

type PaymentFilterQuery struct {
	CompanyID  *int64
	SaleID     *int64
	CustomerID *int64
	Status     *types.PaymentStatus
	Method     *types.PaymentMethod
	Search     string
	Page       int
	PageSize   int
}

