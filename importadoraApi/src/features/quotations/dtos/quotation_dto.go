package dtos

import (
	"time"

	"importadoraApi/src/core/types"
)

type QuotationItemResponse struct {
	ID          int64    `json:"id"`
	QuotationID int64    `json:"quotationId"`
	ProductID   int64    `json:"productId"`
	ProductCode string   `json:"productCode"`
	ProductName string   `json:"productName"`
	Quantity    int      `json:"quantity"`
	UnitPrice   float64  `json:"unitPrice"`
	Discount    float64  `json:"discount"`
	IVAPercent  *float64 `json:"ivaPercent,omitempty"`
	LineTotal   float64  `json:"lineTotal"`
}

type QuotationResponse struct {
	ID            int64                   `json:"id"`
	CompanyID     int64                   `json:"companyId"`
	SerialCode    string                  `json:"serialCode"`
	CustomerID    int64                   `json:"customerId"`
	CustomerName  string                  `json:"customerName"`
	EmployeeID    int64                   `json:"employeeId"`
	EmployeeName  string                  `json:"employeeName"`
	CartID        *int64                  `json:"cartId,omitempty"`
	SaleID        *int64                  `json:"saleId,omitempty"`
	Status        types.QuotationStatus   `json:"status"`
	ValidUntil    *string                 `json:"validUntil,omitempty"`
	Subtotal      float64                 `json:"subtotal"`
	DiscountTotal float64                 `json:"discountTotal"`
	IVATotal      float64                 `json:"ivaTotal"`
	Total         float64                 `json:"total"`
	Notes         *string                 `json:"notes,omitempty"`
	CreatedAt     time.Time               `json:"createdAt"`
	UpdatedAt     time.Time               `json:"updatedAt"`
	Items         []QuotationItemResponse `json:"items,omitempty"`
}

type CreateQuotationItemRequest struct {
	ProductID  int64    `json:"productId" validate:"required"`
	Quantity   int      `json:"quantity" validate:"required,min=1"`
	UnitPrice  float64  `json:"unitPrice" validate:"required,min=0"`
	Discount   *float64 `json:"discount"`
	IVAPercent *float64 `json:"ivaPercent"`
}

type CreateQuotationRequest struct {
	CompanyID   *int64                       `json:"companyId"`
	CustomerID  int64                        `json:"customerId" validate:"required"`
	CartID      *int64                       `json:"cartId"`
	ValidUntil  *string                      `json:"validUntil"` // YYYY-MM-DD
	Notes       *string                      `json:"notes"`
	Items       []CreateQuotationItemRequest `json:"items"`
}

type UpdateQuotationRequest struct {
	ValidUntil *string                `json:"validUntil"`
	Status     *types.QuotationStatus `json:"status"`
	Notes      *string                `json:"notes"`
}

type QuotationFilterQuery struct {
	CompanyID  *int64
	CustomerID *int64
	EmployeeID *int64
	Status     *types.QuotationStatus
	Search     string
	Page       int
	PageSize   int
}

