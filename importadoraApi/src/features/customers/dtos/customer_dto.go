package dtos

import (
	"encoding/json"
	"time"

	"importadoraApi/src/core/types"
)

// ==========================================
// DTOs PARA CLIENTES
// ==========================================

type CustomerResponse struct {
	ID                  int64                  `json:"id"`
	CompanyID           int64                  `json:"companyId"`
	DocumentType        types.DocumentType     `json:"documentType"`
	Document            string                 `json:"document"`
	PersonType          types.PersonType       `json:"personType"`
	Name                string                 `json:"name"`
	LastName            *string                `json:"lastName,omitempty"`
	TradeName           *string                `json:"tradeName,omitempty"`
	LegalRepresentative *string                `json:"legalRepresentative,omitempty"`
	Email               *string                `json:"email,omitempty"`
	Phone               *string                `json:"phone,omitempty"`
	Mobile              *string                `json:"mobile,omitempty"`
	Address             *string                `json:"address,omitempty"`
	City                *string                `json:"city,omitempty"`
	VATResponsible      bool                   `json:"vatResponsible"`
	FiscalRespCodes     []string               `json:"fiscalRespCodes"`
	Addresses           json.RawMessage        `json:"addresses"`
	Contacts            json.RawMessage        `json:"contacts"`
	PriceTier           types.PriceTier        `json:"priceTier"`
	DiscountPercent     float64                `json:"discountPercent"`
	CreditEnabled       bool                   `json:"creditEnabled"`
	CreditLimit         float64                `json:"creditLimit"`
	CreditDays          int16                  `json:"creditDays"`
	Status              types.CustomerStatus   `json:"status"`
	CreatedAt           time.Time              `json:"createdAt"`
	UpdatedAt           time.Time              `json:"updatedAt"`
	Documents           []CustomerDocumentDTO  `json:"documents,omitempty"`
}

type CreateCustomerRequest struct {
	CompanyID           *int64                 `json:"companyId"`
	DocumentType        types.DocumentType     `json:"documentType" validate:"required"`
	Document            string                 `json:"document" validate:"required"`
	PersonType          types.PersonType       `json:"personType" validate:"required"`
	Name                string                 `json:"name" validate:"required"`
	LastName            *string                `json:"lastName"`
	TradeName           *string                `json:"tradeName"`
	LegalRepresentative *string                `json:"legalRepresentative"`
	Email               *string                `json:"email"`
	Phone               *string                `json:"phone"`
	Mobile              *string                `json:"mobile"`
	Address             *string                `json:"address"`
	City                *string                `json:"city"`
	VATResponsible      *bool                  `json:"vatResponsible"`
	FiscalRespCodes     []string               `json:"fiscalRespCodes"`
	Addresses           json.RawMessage        `json:"addresses"`
	Contacts            json.RawMessage        `json:"contacts"`
	PriceTier           types.PriceTier        `json:"priceTier"`
	DiscountPercent     *float64               `json:"discountPercent"`
	CreditEnabled       *bool                  `json:"creditEnabled"`
	CreditLimit         *float64               `json:"creditLimit"`
	CreditDays          *int16                 `json:"creditDays"`
	Status              *types.CustomerStatus  `json:"status"`
}

type UpdateCustomerRequest struct {
	DocumentType        *types.DocumentType    `json:"documentType"`
	Document            *string                `json:"document"`
	PersonType          *types.PersonType      `json:"personType"`
	Name                *string                `json:"name"`
	LastName            *string                `json:"lastName"`
	TradeName           *string                `json:"tradeName"`
	LegalRepresentative *string                `json:"legalRepresentative"`
	Email               *string                `json:"email"`
	Phone               *string                `json:"phone"`
	Mobile              *string                `json:"mobile"`
	Address             *string                `json:"address"`
	City                *string                `json:"city"`
	VATResponsible      *bool                  `json:"vatResponsible"`
	FiscalRespCodes     []string               `json:"fiscalRespCodes"`
	Addresses           json.RawMessage        `json:"addresses"`
	Contacts            json.RawMessage        `json:"contacts"`
	PriceTier           *types.PriceTier       `json:"priceTier"`
	DiscountPercent     *float64               `json:"discountPercent"`
	CreditEnabled       *bool                  `json:"creditEnabled"`
	CreditLimit         *float64               `json:"creditLimit"`
	CreditDays          *int16                 `json:"creditDays"`
	Status              *types.CustomerStatus  `json:"status"`
}

type CustomerFilterQuery struct {
	CompanyID     *int64
	Status        *types.CustomerStatus
	CreditEnabled *bool
	PriceTier     *types.PriceTier
	Search        string
	Page          int
	PageSize      int
}

// ==========================================
// DTOs PARA DOCUMENTOS DE CLIENTES
// ==========================================

type CustomerDocumentDTO struct {
	ID         int64                 `json:"id"`
	CustomerID int64                 `json:"customerId"`
	DocType    types.CustomerDocType `json:"docType"`
	FileName   string                `json:"fileName"`
	FileURL    string                `json:"fileUrl"`
	MimeType   *string               `json:"mimeType,omitempty"`
	Notes      *string               `json:"notes,omitempty"`
	UploadedAt time.Time             `json:"uploadedAt"`
}

type CreateCustomerDocumentRequest struct {
	DocType types.CustomerDocType `json:"docType" validate:"required"`
	Notes   *string               `json:"notes"`
}

