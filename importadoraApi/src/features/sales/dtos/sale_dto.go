package dtos

import (
	"encoding/json"
	"time"

	"importadoraApi/src/core/types"
)

type SaleItemResponse struct {
	ID                     int64              `json:"id"`
	SaleID                 int64              `json:"saleId"`
	ProductID              int64              `json:"productId"`
	StockID                int64              `json:"stockId"`
	ProductCode            string             `json:"productCode"`
	ProductName            string             `json:"productName"`
	PriceTier              types.PriceTier    `json:"priceTier"`
	Quantity               int                `json:"quantity"`
	PickedQty              int                `json:"pickedQty"`
	PackedQty              int                `json:"packedQty"`
	DispatchedQty          int                `json:"dispatchedQty"`
	UnitPrice              float64            `json:"unitPrice"`
	UnitCost               float64            `json:"unitCost"`
	Discount               float64            `json:"discount"`
	IVAPercent             *float64           `json:"ivaPercent,omitempty"`
	IVAAmount              float64            `json:"ivaAmount"`
	Subtotal               float64            `json:"subtotal"`
	LineTotal              float64            `json:"lineTotal"`
	ProcessStage           types.ProcessStage `json:"processStage"`
	StageStatus            types.StageStatus  `json:"stageStatus"`
	VerifiedByEmployeeID   *int64             `json:"verifiedByEmployeeId,omitempty"`
	VerifiedByName         *string            `json:"verifiedByName,omitempty"`
	VerifiedAt             *time.Time         `json:"verifiedAt,omitempty"`
	PickedByEmployeeID     *int64             `json:"pickedByEmployeeId,omitempty"`
	PickedByName           *string            `json:"pickedByName,omitempty"`
	PickedAt               *time.Time         `json:"pickedAt,omitempty"`
	PackedByEmployeeID     *int64             `json:"packedByEmployeeId,omitempty"`
	PackedByName           *string            `json:"packedByName,omitempty"`
	PackedAt               *time.Time         `json:"packedAt,omitempty"`
	InvoicedByEmployeeID   *int64             `json:"invoicedByEmployeeId,omitempty"`
	InvoicedByName         *string            `json:"invoicedByName,omitempty"`
	InvoicedAt             *time.Time         `json:"invoicedAt,omitempty"`
	DispatchedByEmployeeID *int64             `json:"dispatchedByEmployeeId,omitempty"`
	DispatchedByName       *string            `json:"dispatchedByName,omitempty"`
	DispatchedAt           *time.Time         `json:"dispatchedAt,omitempty"`
	SentByEmployeeID       *int64             `json:"sentByEmployeeId,omitempty"`
	SentByName             *string            `json:"sentByName,omitempty"`
	SentAt                 *time.Time         `json:"sentAt,omitempty"`
	ProcessNotes           *string            `json:"processNotes,omitempty"`
}

type SaleResponse struct {
	ID                    int64                   `json:"id"`
	CompanyID             int64                   `json:"companyId"`
	SerialCode            string                  `json:"serialCode"`
	CustomerID            *int64                  `json:"customerId,omitempty"`
	CustomerName          *string                 `json:"customerName,omitempty"`
	EmployeeID            int64                   `json:"employeeId"`
	EmployeeName          string                  `json:"employeeName"`
	WarehouseID           int64                   `json:"warehouseId"`
	WarehouseName         string                  `json:"warehouseName"`
	CartID                *int64                  `json:"cartId,omitempty"`
	PriceTier             types.PriceTier         `json:"priceTier"`
	PaymentMethod         types.PaymentMethod     `json:"paymentMethod"`
	PaymentCondition      *types.PaymentCondition `json:"paymentCondition,omitempty"`
	ImmediatePicking      bool                    `json:"immediatePicking"`
	Status                types.SaleStatus        `json:"status"`
	CurrentStage          types.ProcessStage      `json:"currentStage"`
	Subtotal              float64                 `json:"subtotal"`
	DiscountTotal         float64                 `json:"discountTotal"`
	IVATotal              float64                 `json:"ivaTotal"`
	Total                 float64                 `json:"total"`
	PaidTotal             float64                 `json:"paidTotal"`
	SaleAt                *time.Time              `json:"saleAt,omitempty"`
	DueDate               *string                 `json:"dueDate,omitempty"`
	ShippingAddress       json.RawMessage         `json:"shippingAddress,omitempty"`
	CarrierID             *int64                  `json:"carrierId,omitempty"`
	CarrierName           *string                 `json:"carrierName,omitempty"`
	TrackingNo            *string                 `json:"trackingNo,omitempty"`
	CancelReason          *string                 `json:"cancelReason,omitempty"`
	CancelledByEmployeeID *int64                  `json:"cancelledByEmployeeId,omitempty"`
	CancelledByName       *string                 `json:"cancelledByName,omitempty"`
	Notes                 *string                 `json:"notes,omitempty"`
	CreatedAt             time.Time               `json:"createdAt"`
	UpdatedAt             time.Time               `json:"updatedAt"`
	Items                 []SaleItemResponse      `json:"items,omitempty"`
	Invoices              []InvoiceResponse       `json:"invoices,omitempty"`
}

type CreateSaleItemRequest struct {
	StockID    int64    `json:"stockId" validate:"required"`
	Quantity   int      `json:"quantity" validate:"required,min=1"`
	UnitPrice  *float64 `json:"unitPrice"`
	Discount   *float64 `json:"discount"`
	IVAPercent *float64 `json:"ivaPercent"`
}

type CreateSaleRequest struct {
	CompanyID             *int64                  `json:"companyId"`
	CustomerID            *int64                  `json:"customerId"`
	SalespersonEmployeeID *int64                  `json:"salespersonEmployeeId,omitempty"`
	WarehouseID           int64                   `json:"warehouseId" validate:"required"`
	CartID                *int64                  `json:"cartId"`
	QuotationID           *int64                  `json:"quotationId"`
	PriceTier             *types.PriceTier        `json:"priceTier"`
	PaymentMethod         types.PaymentMethod     `json:"paymentMethod" validate:"required"`
	PaymentCondition      *types.PaymentCondition `json:"paymentCondition"`
	ImmediatePicking      *bool                   `json:"immediatePicking"`
	DueDate               *string                 `json:"dueDate"`
	ShippingAddress       json.RawMessage         `json:"shippingAddress"`
	CarrierID             *int64                  `json:"carrierId"`
	TrackingNo            *string                 `json:"trackingNo"`
	Notes                 *string                 `json:"notes"`
	Items                 []CreateSaleItemRequest `json:"items"`
}

type DispatchSaleRequest struct {
	CarrierID  *int64  `json:"carrierId"`
	TrackingNo *string `json:"trackingNo"`
	Notes      *string `json:"notes"`
}

type CancelSaleRequest struct {
	Reason string `json:"reason" validate:"required"`
}

type SaleFilterQuery struct {
	CompanyID     *int64
	WarehouseID   *int64
	CustomerID    *int64
	EmployeeID    *int64
	Status        *types.SaleStatus
	Stage         *types.ProcessStage
	PaymentMethod *types.PaymentMethod
	Search        string
	Page          int
	PageSize      int
}

// ==========================================
// DTOs PARA FACTURAS (INVOICES)
// ==========================================

type InvoiceResponse struct {
	ID                     int64               `json:"id"`
	CompanyID              int64               `json:"companyId"`
	WarehouseID            int64               `json:"warehouseId"`
	WarehouseName          string              `json:"warehouseName"`
	WarehouseFacturationID int64               `json:"warehouseFacturationId"`
	SaleID                 int64               `json:"saleId"`
	SaleSerial             string              `json:"saleSerial"`
	ReturnID               *int64              `json:"returnId,omitempty"`
	EmployeeID             *int64              `json:"employeeId,omitempty"`
	EmployeeName           *string             `json:"employeeName,omitempty"`
	Kind                   types.InvoiceKind   `json:"kind"`
	Number                 string              `json:"number"`
	Status                 types.InvoiceStatus `json:"status"`
	PDFURL                 *string             `json:"pdfUrl,omitempty"`
	IssuedAt               time.Time           `json:"issuedAt"`
	CreatedAt              time.Time           `json:"createdAt"`
}

type InvoiceFilterQuery struct {
	CompanyID   *int64
	WarehouseID *int64
	SaleID      *int64
	Status      *types.InvoiceStatus
	Kind        *types.InvoiceKind
	Page        int
	PageSize    int
}
