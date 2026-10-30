package dtos

import (
	"time"

	"importadoraApi/src/core/types"
)

type ReturnItemResponse struct {
	ID          int64   `json:"id"`
	ReturnID    int64   `json:"returnId"`
	SaleItemID  int64   `json:"saleItemId"`
	ProductCode string  `json:"productCode"`
	ProductName string  `json:"productName"`
	Quantity    int     `json:"quantity"`
	UnitPrice   float64 `json:"unitPrice"`
	LineTotal   float64 `json:"lineTotal"`
	Restock     bool    `json:"restock"`
}

type ReturnResponse struct {
	ID                     int64                      `json:"id"`
	CompanyID              int64                      `json:"companyId"`
	SaleID                 int64                      `json:"saleId"`
	SaleSerial             string                     `json:"saleSerial"`
	CustomerID             int64                      `json:"customerId"`
	CustomerName           string                     `json:"customerName"`
	EmployeeID             int64                      `json:"employeeId"`
	EmployeeName           string                     `json:"employeeName"`
	ApprovedByEmployeeID   *int64                     `json:"approvedByEmployeeId,omitempty"`
	ApprovedByName         *string                    `json:"approvedByName,omitempty"`
	Reason                 string                     `json:"reason"`
	ReasonType             types.ReturnReasonType     `json:"reasonType"`
	ResolutionType         types.ReturnResolutionType `json:"resolutionType"`
	ReplacementProductID   *int64                     `json:"replacementProductId,omitempty"`
	ReplacementStockID     *int64                     `json:"replacementStockId,omitempty"`
	ReplacementProductCode *string                    `json:"replacementProductCode,omitempty"`
	ReplacementProductName *string                    `json:"replacementProductName,omitempty"`
	Status                 types.ReturnStatus         `json:"status"`
	Total                  float64                    `json:"total"`
	ApprovedAt             *time.Time                 `json:"approvedAt,omitempty"`
	CreatedAt              time.Time                  `json:"createdAt"`
	Items                  []ReturnItemResponse       `json:"items,omitempty"`
}

type CreateReturnItemRequest struct {
	SaleItemID int64 `json:"saleItemId" validate:"required"`
	Quantity   int   `json:"quantity" validate:"required,min=1"`
	Restock    *bool `json:"restock"`
}

type CreateReturnRequest struct {
	SaleID             int64                      `json:"saleId" validate:"required"`
	Reason             string                     `json:"reason" validate:"required"`
	ReasonType         types.ReturnReasonType     `json:"reasonType" validate:"required"`
	ResolutionType     types.ReturnResolutionType `json:"resolutionType" validate:"required"`
	ReplacementStockID *int64                     `json:"replacementStockId,omitempty"`
	Items              []CreateReturnItemRequest  `json:"items" validate:"required,min=1"`
}

type ReturnFilterQuery struct {
	CompanyID  *int64
	SaleID     *int64
	CustomerID *int64
	Status     *types.ReturnStatus
	Page       int
	PageSize   int
}

