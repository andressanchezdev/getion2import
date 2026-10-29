package dtos

import (
	"time"

	"importadoraApi/src/core/types"
)

type ExternalResponse struct {
	ID           int64              `json:"id"`
	CompanyID    int64              `json:"companyId"`
	Kind         types.ExternalKind `json:"kind"`
	Category     *string            `json:"category,omitempty"`
	DocumentType types.DocumentType `json:"documentType"`
	Document     *string            `json:"document,omitempty"`
	Name         string             `json:"name"`
	ContactName  *string            `json:"contactName,omitempty"`
	ContactPhone *string            `json:"contactPhone,omitempty"`
	ContactEmail *string            `json:"contactEmail,omitempty"`
	Phone        *string            `json:"phone,omitempty"`
	Email        *string            `json:"email,omitempty"`
	Address      *string            `json:"address,omitempty"`
	City         *string            `json:"city,omitempty"`
	TermsDays    int16              `json:"termsDays"`
	CreditLimit  float64            `json:"creditLimit"`
	Coverage     *string            `json:"coverage,omitempty"`
	IsActive     bool               `json:"isActive"`
	CreatedAt    time.Time          `json:"createdAt"`
	UpdatedAt    time.Time          `json:"updatedAt"`
}

type CreateExternalRequest struct {
	CompanyID    *int64             `json:"companyId"`
	Kind         types.ExternalKind `json:"kind" validate:"required"`
	Category     *string            `json:"category"`
	DocumentType types.DocumentType `json:"documentType"`
	Document     *string            `json:"document"`
	Name         string             `json:"name" validate:"required"`
	ContactName  *string            `json:"contactName"`
	ContactPhone *string            `json:"contactPhone"`
	ContactEmail *string            `json:"contactEmail"`
	Phone        *string            `json:"phone"`
	Email        *string            `json:"email"`
	Address      *string            `json:"address"`
	City         *string            `json:"city"`
	TermsDays    *int16             `json:"termsDays"`
	CreditLimit  *float64           `json:"creditLimit"`
	Coverage     *string            `json:"coverage"`
	IsActive     *bool              `json:"isActive"`
}

type UpdateExternalRequest struct {
	Kind         *types.ExternalKind `json:"kind"`
	Category     *string             `json:"category"`
	DocumentType *types.DocumentType `json:"documentType"`
	Document     *string             `json:"document"`
	Name         *string             `json:"name"`
	ContactName  *string             `json:"contactName"`
	ContactPhone *string             `json:"contactPhone"`
	ContactEmail *string             `json:"contactEmail"`
	Phone        *string             `json:"phone"`
	Email        *string             `json:"email"`
	Address      *string             `json:"address"`
	City         *string             `json:"city"`
	TermsDays    *int16              `json:"termsDays"`
	CreditLimit  *float64            `json:"creditLimit"`
	Coverage     *string             `json:"coverage"`
	IsActive     *bool               `json:"isActive"`
}

type ExternalFilterQuery struct {
	CompanyID *int64
	Kind      *types.ExternalKind
	Category  *string
	IsActive  *bool
	Search    string
	Page      int
	PageSize  int
}

