package dtos

import (
	"time"

	"importadoraApi/src/core/types"
)

type PurchaseItemResponse struct {
	ID           int64    `json:"id"`
	PurchaseID   int64    `json:"purchaseId"`
	ProductID    int64    `json:"productId"`
	ProductCode  string   `json:"productCode"`
	ProductName  string   `json:"productName"`
	SupplierCode *string  `json:"supplierCode,omitempty"`
	Quantity     int      `json:"quantity"`
	ReceivedQty  int      `json:"receivedQty"`
	UnitCost     float64  `json:"unitCost"`
	IVAPercent   *float64 `json:"ivaPercent,omitempty"`
	Subtotal     float64  `json:"subtotal"`
}

type PurchaseResponse struct {
	ID            int64                  `json:"id"`
	CompanyID     int64                  `json:"companyId"`
	SerialCode    string                 `json:"serialCode"`
	SupplierID    int64                  `json:"supplierId"`
	SupplierName  string                 `json:"supplierName"`
	WarehouseID   int64                  `json:"warehouseId"`
	WarehouseName string                 `json:"warehouseName"`
	EmployeeID    int64                  `json:"employeeId"`
	EmployeeName  string                 `json:"employeeName"`
	Status        types.PurchaseStatus   `json:"status"`
	SupplierRef   *string                `json:"supplierRef,omitempty"`
	ExpectedDate  *string                `json:"expectedDate,omitempty"`
	Subtotal      float64                `json:"subtotal"`
	IVATotal      float64                `json:"ivaTotal"`
	Total         float64                `json:"total"`
	Notes         *string                `json:"notes,omitempty"`
	ReceivedAt    *time.Time             `json:"receivedAt,omitempty"`
	CreatedAt     time.Time              `json:"createdAt"`
	UpdatedAt     time.Time              `json:"updatedAt"`
	Items         []PurchaseItemResponse `json:"items,omitempty"`
}

type CreatePurchaseItemRequest struct {
	ProductID  int64    `json:"productId" validate:"required"`
	Quantity   int      `json:"quantity" validate:"required,min=1"`
	UnitCost   float64  `json:"unitCost" validate:"required,gte=0"`
	IVAPercent *float64 `json:"ivaPercent"`
}

type CreatePurchaseRequest struct {
	CompanyID    *int64                      `json:"companyId"`
	SupplierID   int64                       `json:"supplierId" validate:"required"`
	WarehouseID  int64                       `json:"warehouseId" validate:"required"`
	SupplierRef  *string                     `json:"supplierRef"`
	ExpectedDate *string                     `json:"expectedDate"` // YYYY-MM-DD
	Notes        *string                     `json:"notes"`
	Items        []CreatePurchaseItemRequest `json:"items" validate:"required,min=1"`
}

type ReceivePurchaseItemRequest struct {
	PurchaseItemID int64 `json:"purchaseItemId" validate:"required"`
	Quantity       int   `json:"quantity" validate:"required,min=1"`
}

type ReceivePurchaseRequest struct {
	Items []ReceivePurchaseItemRequest `json:"items" validate:"required,min=1"`
}

type PurchaseFilterQuery struct {
	CompanyID   *int64
	SupplierID  *int64
	WarehouseID *int64
	Status      *types.PurchaseStatus
	Search      string
	Page        int
	PageSize    int
}

type SupplierProductItemDTO struct {
	ProductID    int64   `json:"productId"`
	ProductCode  string  `json:"productCode"`
	ProductName  string  `json:"productName"`
	SupplierCode string  `json:"supplierCode"`
	Cost         float64 `json:"cost"`
}

type SupplierCatalogUploadResponse struct {
	SupplierID      int64    `json:"supplierId"`
	SupplierName    string   `json:"supplierName"`
	TotalRowsRead   int      `json:"totalRowsRead"`
	ProductsMatched int      `json:"productsMatched"`
	ProductsUpdated int      `json:"productsUpdated"`
	Warnings        []string `json:"warnings,omitempty"`
}

