package dtos

import (
	"time"

	"importadoraApi/src/core/types"
)

type CartItemResponse struct {
	ID          int64   `json:"id"`
	CartID      int64   `json:"cartId"`
	ProductID   int64   `json:"productId"`
	ProductCode string  `json:"productCode"`
	ProductName string  `json:"productName"`
	StockID     int64   `json:"stockId"`
	Location    string  `json:"location"`
	Quantity    int     `json:"quantity"`
	UnitPrice   float64 `json:"unitPrice"`
	Discount    float64 `json:"discount"`
	LineTotal   float64 `json:"lineTotal"`
}

type CartResponse struct {
	ID            int64              `json:"id"`
	UUID          string             `json:"uuid"`
	CompanyID     int64              `json:"companyId"`
	EmployeeID    *int64             `json:"employeeId,omitempty"`
	EmployeeName  *string            `json:"employeeName,omitempty"`
	CustomerID    *int64             `json:"customerId,omitempty"`
	CustomerName  *string            `json:"customerName,omitempty"`
	WarehouseID   *int64             `json:"warehouseId,omitempty"`
	WarehouseName *string            `json:"warehouseName,omitempty"`
	PriceTier     types.PriceTier    `json:"priceTier"`
	Status        types.CartStatus   `json:"status"`
	ExpiresAt     time.Time          `json:"expiresAt"`
	CreatedAt     time.Time          `json:"createdAt"`
	UpdatedAt     time.Time          `json:"updatedAt"`
	Items         []CartItemResponse `json:"items"`
	Subtotal      float64            `json:"subtotal"`
	DiscountTotal float64            `json:"discountTotal"`
	Total         float64            `json:"total"`
}

type CreateCartRequest struct {
	CompanyID   *int64           `json:"companyId"`
	CustomerID  *int64           `json:"customerId"`
	WarehouseID *int64           `json:"warehouseId"`
	PriceTier   *types.PriceTier `json:"priceTier"`
}

type AddCartItemRequest struct {
	StockID   int64    `json:"stockId" validate:"required"`
	Quantity  int      `json:"quantity" validate:"required,min=1"`
	UnitPrice *float64 `json:"unitPrice"`
	Discount  *float64 `json:"discount"`
}

type UpdateCartItemRequest struct {
	Quantity  int      `json:"quantity" validate:"required,min=1"`
	UnitPrice *float64 `json:"unitPrice"`
	Discount  *float64 `json:"discount"`
}

