package dtos

import (
	"time"

	"importadoraApi/src/core/types"
)

// WarehouseFacturationResponse representa los datos fiscales de facturación de una bodega.
type WarehouseFacturationResponse struct {
	ID               int64                 `json:"id"`
	CompanyID        int64                 `json:"companyId"`
	WarehouseID      int64                 `json:"warehouseId"`
	TypeFacturation  types.TypeFacturation `json:"typeFacturation"`
	DocumentType     types.DocumentType    `json:"documentType"`
	NIT              string                `json:"nit"`
	LegalName        string                `json:"legalName"`
	TradeName        string                `json:"tradeName,omitempty"`
	BillingEmail     string                `json:"billingEmail,omitempty"`
	BillingPhone     string                `json:"billingPhone,omitempty"`
	BillingAddress   string                `json:"billingAddress,omitempty"`
	BillingCity      string                `json:"billingCity,omitempty"`
	LogoURL          string                `json:"logoUrl,omitempty"`
	VatWithholder    bool                  `json:"vatWithholder"`
	IncomeWithholder bool                  `json:"incomeWithholder"`
	SelfWithholder   bool                  `json:"selfWithholder"`
	InvoicePrefix    string                `json:"invoicePrefix,omitempty"`
	ResolutionNumber string                `json:"resolutionNumber,omitempty"`
	ResolutionDate   *string               `json:"resolutionDate,omitempty"`
	RangeFrom        *int64                `json:"rangeFrom,omitempty"`
	RangeTo          *int64                `json:"rangeTo,omitempty"`
	IsActive         bool                  `json:"isActive"`
	CreatedAt        time.Time             `json:"createdAt"`
	UpdatedAt        time.Time             `json:"updatedAt"`
}

// WarehouseResponse representa los datos de una bodega junto a su facturación si está configurada.
type WarehouseResponse struct {
	ID          int64                         `json:"id"`
	CompanyID   int64                         `json:"companyId"`
	Code        string                        `json:"code"`
	Name        string                        `json:"name"`
	City        string                        `json:"city,omitempty"`
	Address     string                        `json:"address,omitempty"`
	Phone       string                        `json:"phone,omitempty"`
	Description string                        `json:"description,omitempty"`
	IsActive    bool                          `json:"isActive"`
	CreatedAt   time.Time                     `json:"createdAt"`
	UpdatedAt   time.Time                     `json:"updatedAt"`
	Facturation *WarehouseFacturationResponse `json:"facturation,omitempty"`
}

// CreateWarehouseRequest entrada para POST /warehouses.
type CreateWarehouseRequest struct {
	CompanyID   *int64 `json:"companyId,omitempty"` // Superadmin puede especificar, otros heredan del token
	Code        string `json:"code"`
	Name        string `json:"name"`
	City        string `json:"city,omitempty"`
	Address     string `json:"address,omitempty"`
	Phone       string `json:"phone,omitempty"`
	Description string `json:"description,omitempty"`
	IsActive    *bool  `json:"isActive,omitempty"`
}

// UpdateWarehouseRequest entrada para PUT /warehouses/:id.
type UpdateWarehouseRequest struct {
	Code        *string `json:"code,omitempty"`
	Name        *string `json:"name,omitempty"`
	City        *string `json:"city,omitempty"`
	Address     *string `json:"address,omitempty"`
	Phone       *string `json:"phone,omitempty"`
	Description *string `json:"description,omitempty"`
	IsActive    *bool   `json:"isActive,omitempty"`
}

// UpdateFacturationRequest entrada para PUT /warehouses/:id/facturation.
type UpdateFacturationRequest struct {
	TypeFacturation  *types.TypeFacturation `json:"typeFacturation,omitempty"`
	DocumentType     *types.DocumentType    `json:"documentType,omitempty"`
	NIT              *string                `json:"nit,omitempty"`
	LegalName        *string                `json:"legalName,omitempty"`
	TradeName        *string                `json:"tradeName,omitempty"`
	BillingEmail     *string                `json:"billingEmail,omitempty"`
	BillingPhone     *string                `json:"billingPhone,omitempty"`
	BillingAddress   *string                `json:"billingAddress,omitempty"`
	BillingCity      *string                `json:"billingCity,omitempty"`
	LogoURL          *string                `json:"logoUrl,omitempty"`
	VatWithholder    *bool                  `json:"vatWithholder,omitempty"`
	IncomeWithholder *bool                  `json:"incomeWithholder,omitempty"`
	SelfWithholder   *bool                  `json:"selfWithholder,omitempty"`
	InvoicePrefix    *string                `json:"invoicePrefix,omitempty"`
	ResolutionNumber *string                `json:"resolutionNumber,omitempty"`
	ResolutionDate   *string                `json:"resolutionDate,omitempty"` // Formato YYYY-MM-DD
	RangeFrom        *int64                 `json:"rangeFrom,omitempty"`
	RangeTo          *int64                 `json:"rangeTo,omitempty"`
	IsActive         *bool                  `json:"isActive,omitempty"`
}

// DocSeriesResponse representa un registro de serie numérica.
type DocSeriesResponse struct {
	ID          int64               `json:"id"`
	CompanyID   int64               `json:"companyId"`
	WarehouseID *int64              `json:"warehouseId,omitempty"`
	DocType     types.DocSeriesType `json:"docType"`
	Prefix      string              `json:"prefix"`
	NextNumber  int64               `json:"nextNumber"`
}

// UpdateDocSeriesRequest entrada para PUT /doc-series/:id.
type UpdateDocSeriesRequest struct {
	Prefix     *string `json:"prefix,omitempty"`
	NextNumber *int64  `json:"nextNumber,omitempty"`
}
