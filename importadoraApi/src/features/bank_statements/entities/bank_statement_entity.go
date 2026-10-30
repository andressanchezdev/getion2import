package entities

import (
	"time"
)

type BankStatementRecordEntity struct {
	ID             int64      `json:"id"`
	CompanyID      int64      `json:"companyId"`
	BankName       string     `json:"bankName"`
	AccountNumber  string     `json:"accountNumber"`
	MovementDate   time.Time  `json:"movementDate"`
	Description    string     `json:"description"`
	BranchChannel  string     `json:"branchChannel"`
	Reference1     *string    `json:"reference1,omitempty"`
	Reference2     *string    `json:"reference2,omitempty"`
	DocumentNumber *string    `json:"documentNumber,omitempty"`
	Amount         float64    `json:"amount"`
	IsIncome       bool       `json:"isIncome"`
	Status         string     `json:"status"` // pending, confirmed, ignored
	ConfirmedByID  *int64     `json:"confirmedById,omitempty"`
	ConfirmedByName *string   `json:"confirmedByName,omitempty"`
	ConfirmedAt    *time.Time `json:"confirmedAt,omitempty"`
	Notes          *string    `json:"notes,omitempty"`
	CreatedAt      time.Time  `json:"createdAt"`
}

