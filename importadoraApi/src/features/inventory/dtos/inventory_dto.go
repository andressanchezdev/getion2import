package dtos

import (
	"encoding/json"
	"time"

	"importadoraApi/src/core/types"
)

// ==========================================
// DTOs PARA STOCK
// ==========================================

type WarehouseStockResponse struct {
	StockID       int64           `json:"stockId"`
	CompanyID     int64           `json:"companyId"`
	WarehouseID   int64           `json:"warehouseId"`
	WarehouseCode string          `json:"warehouseCode"`
	WarehouseName string          `json:"warehouseName"`
	ProductID     int64           `json:"productId"`
	ProductCode   string          `json:"productCode"`
	ProductName   string          `json:"productName"`
	CategoryID    int64           `json:"categoryId"`
	CategoryName  string          `json:"categoryName"`
	BrandID       *int64          `json:"brandId,omitempty"`
	BrandName     *string         `json:"brandName,omitempty"`
	ModelID       *int64          `json:"modelId,omitempty"`
	ModelName     *string         `json:"modelName,omitempty"`
	IVA           *float64        `json:"iva,omitempty"`
	Prices        json.RawMessage `json:"prices"`
	Location      string          `json:"location"`
	Available     int             `json:"available"`
	Reserved      int             `json:"reserved"`
	Sellable      int             `json:"sellable"`
	MinStock      int             `json:"minStock"`
	MaxStock      *int            `json:"maxStock,omitempty"`
	UpdatedAt     time.Time       `json:"updatedAt"`
}

type CompanyStockResponse struct {
	CompanyID   int64  `json:"companyId"`
	ProductID   int64  `json:"productId"`
	ProductCode string `json:"productCode"`
	ProductName string `json:"productName"`
	Available   int    `json:"available"`
	Reserved    int    `json:"reserved"`
	Sellable    int    `json:"sellable"`
}

type StockFilterQuery struct {
	CompanyID   *int64
	WarehouseID *int64
	ProductID   *int64
	Location    *string
	Search      string
	Page        int
	PageSize    int
}

type AdjustStockRequest struct {
	StockID  int64  `json:"stockId" validate:"required"`
	NewQty   int    `json:"newQty" validate:"min=0"`
	Reason   string `json:"reason" validate:"required"`
}

type RelocateStockRequest struct {
	OriginStockID       int64  `json:"originStockId" validate:"required"`
	DestinationLocation string `json:"destinationLocation" validate:"required"`
	Quantity            int    `json:"quantity" validate:"required,min=1"`
	Reason              string `json:"reason"`
}

// ==========================================
// DTOs PARA TRASLADOS MULTI-ÍTEM
// ==========================================

type TransferItemResponse struct {
	ID                  int64   `json:"id"`
	ProductID           int64   `json:"productId"`
	ProductCode         string  `json:"productCode"`
	ProductName         string  `json:"productName"`
	OriginStockID       int64   `json:"originStockId"`
	DestinationStockID  *int64  `json:"destinationStockId,omitempty"`
	DestinationLocation string  `json:"destinationLocation"`
	Quantity            int     `json:"quantity"`
	ReceivedQty         int     `json:"receivedQty"`
	Notes               *string `json:"notes,omitempty"`
}

type TransferResponse struct {
	ID                     int64                  `json:"id"`
	CompanyID              int64                  `json:"companyId"`
	SerialCode             string                 `json:"serialCode"`
	OriginWarehouseID      int64                  `json:"originWarehouseId"`
	OriginWarehouseName    string                 `json:"originWarehouseName"`
	DestinationWarehouseID int64                  `json:"destinationWarehouseId"`
	DestinationWarehouseName string               `json:"destinationWarehouseName"`
	EmployeeID             int64                  `json:"employeeId"`
	EmployeeName           string                 `json:"employeeName"`
	DispatchedByEmployeeID *int64                 `json:"dispatchedByEmployeeId,omitempty"`
	DispatchedByName       *string                `json:"dispatchedByName,omitempty"`
	ReceivedByEmployeeID   *int64                 `json:"receivedByEmployeeId,omitempty"`
	ReceivedByName         *string                `json:"receivedByName,omitempty"`
	Status                 types.TransferStatus   `json:"status"`
	Notes                  *string                `json:"notes,omitempty"`
	CancelReason           *string                `json:"cancelReason,omitempty"`
	DispatchedAt           *time.Time             `json:"dispatchedAt,omitempty"`
	ReceivedAt             *time.Time             `json:"receivedAt,omitempty"`
	CreatedAt              time.Time              `json:"createdAt"`
	UpdatedAt              time.Time              `json:"updatedAt"`
	Items                  []TransferItemResponse `json:"items,omitempty"`
}

type CreateTransferItemRequest struct {
	ProductID           int64   `json:"productId" validate:"required"`
	OriginStockID       int64   `json:"originStockId" validate:"required"`
	DestinationLocation string  `json:"destinationLocation"`
	Quantity            int     `json:"quantity" validate:"required,min=1"`
	Notes               *string `json:"notes"`
}

type CreateTransferRequest struct {
	OriginWarehouseID      int64                       `json:"originWarehouseId" validate:"required"`
	DestinationWarehouseID int64                       `json:"destinationWarehouseId" validate:"required"`
	Notes                  *string                     `json:"notes"`
	Items                  []CreateTransferItemRequest `json:"items" validate:"required,min=1"`
}

type ReceiveTransferItemRequest struct {
	ItemID              int64  `json:"itemId" validate:"required"`
	ReceivedQty         int    `json:"receivedQty" validate:"min=0"`
	DestinationLocation string `json:"destinationLocation"`
}

type ReceiveTransferRequest struct {
	Items []ReceiveTransferItemRequest `json:"items"`
}

type CancelTransferRequest struct {
	Reason string `json:"reason" validate:"required"`
}

type TransferFilterQuery struct {
	CompanyID              *int64
	OriginWarehouseID      *int64
	DestinationWarehouseID *int64
	Status                 *types.TransferStatus
	Page                   int
	PageSize               int
}

// ==========================================
// DTOs PARA CONTEOS FÍSICOS
// ==========================================

type CountItemResponse struct {
	ID           int64   `json:"id"`
	StockID      int64   `json:"stockId"`
	ProductCode  string  `json:"productCode"`
	ProductName  string  `json:"productName"`
	Location     string  `json:"location"`
	ExpectedQty  int     `json:"expectedQty"`
	CountedQty   *int    `json:"countedQty,omitempty"`
	Difference   *int    `json:"difference,omitempty"`
	EmployeeID   *int64  `json:"employeeId,omitempty"`
	EmployeeName *string `json:"employeeName,omitempty"`
}

type CountResponse struct {
	ID            int64               `json:"id"`
	CompanyID     int64               `json:"companyId"`
	WarehouseID   int64               `json:"warehouseId"`
	WarehouseName string              `json:"warehouseName"`
	EmployeeID    *int64              `json:"employeeId,omitempty"`
	EmployeeName  *string             `json:"employeeName,omitempty"`
	Status        types.CountStatus   `json:"status"`
	Notes         *string             `json:"notes,omitempty"`
	CreatedAt     time.Time           `json:"createdAt"`
	ClosedAt      *time.Time          `json:"closedAt,omitempty"`
	Items         []CountItemResponse `json:"items,omitempty"`
}

type CreateCountRequest struct {
	WarehouseID int64   `json:"warehouseId" validate:"required"`
	Notes       *string `json:"notes"`
}

type UpdateCountItemRequest struct {
	StockID    int64 `json:"stockId" validate:"required"`
	CountedQty int   `json:"countedQty" validate:"min=0"`
}

type UpdateCountItemsRequest struct {
	Items []UpdateCountItemRequest `json:"items" validate:"required,min=1"`
}

type CountFilterQuery struct {
	CompanyID   *int64
	WarehouseID *int64
	Status      *types.CountStatus
	Page        int
	PageSize    int
}

// ==========================================
// DTOs PARA KARDEX / AUDIT MOVEMENTS
// ==========================================

type AuditMovementResponse struct {
	ID            int64              `json:"id"`
	CompanyID     int64              `json:"companyId"`
	StockID       int64              `json:"stockId"`
	WarehouseID   int64              `json:"warehouseId"`
	WarehouseName string             `json:"warehouseName"`
	ProductID     int64              `json:"productId"`
	ProductCode   string             `json:"productCode"`
	ProductName   string             `json:"productName"`
	EmployeeID    *int64             `json:"employeeId,omitempty"`
	EmployeeName  *string            `json:"employeeName,omitempty"`
	MovementType  types.MovementType `json:"movementType"`
	Quantity      int                `json:"quantity"`
	PreviousQty   *int               `json:"previousQty,omitempty"`
	NewQty        *int               `json:"newQty,omitempty"`
	ReferenceType *string            `json:"referenceType,omitempty"`
	ReferenceID   *int64             `json:"referenceId,omitempty"`
	Reason        *string            `json:"reason,omitempty"`
	CreatedAt     time.Time          `json:"createdAt"`
}

type MovementFilterQuery struct {
	CompanyID    *int64
	StockID      *int64
	WarehouseID  *int64
	ProductID    *int64
	MovementType *types.MovementType
	Page         int
	PageSize     int
}

