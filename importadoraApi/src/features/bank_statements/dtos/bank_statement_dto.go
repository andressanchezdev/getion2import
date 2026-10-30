package dtos

import (
	"time"
)

type BankStatementRecordDTO struct {
	ID              int64      `json:"id"`
	CompanyID       int64      `json:"companyId"`
	BankName        string     `json:"bankName"`
	AccountNumber   string     `json:"accountNumber"`
	MovementDate    string     `json:"movementDate"`
	Description     string     `json:"description"`
	BranchChannel   string     `json:"branchChannel"`
	Reference1      *string    `json:"reference1,omitempty"`
	Reference2      *string    `json:"reference2,omitempty"`
	DocumentNumber  *string    `json:"documentNumber,omitempty"`
	Amount          float64    `json:"amount"`
	IsIncome        bool       `json:"isIncome"`
	Status          string     `json:"status"`
	ConfirmedByID   *int64     `json:"confirmedById,omitempty"`
	ConfirmedByName *string    `json:"confirmedByName,omitempty"`
	ConfirmedAt     *time.Time `json:"confirmedAt,omitempty"`
	Notes           *string    `json:"notes,omitempty"`
	CreatedAt       time.Time  `json:"createdAt"`
}

type BankStatementFilterQuery struct {
	CompanyID     int64
	Description   string
	BranchChannel string
	DateFrom      string
	DateTo        string
	Status        string
	Page          int
	PageSize      int
}

type ConfirmBankRecordRequest struct {
	Notes     *string `json:"notes"`
	PaymentID *int64  `json:"paymentId"`
}

type UploadBankStatementResponse struct {
	TotalProcessed int                      `json:"totalProcessed"`
	TotalInserted  int                      `json:"totalInserted"`
	AccountInfo    string                   `json:"accountInfo"`
	Records        []BankStatementRecordDTO `json:"records"`
}

