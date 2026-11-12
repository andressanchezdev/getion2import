package dtos

// product_dto.go · formas de lo que entra y sale por la API en productos (peticiones y respuestas)
// conecta con: los controllers y services de productos

import (
	"encoding/json"
	"time"

	"importadoraApi/src/core/types"
)

// ==========================================
// DTOs PARA PRODUCTOS
// ==========================================

type ProductPrices map[string]float64

// ToMap devuelve las tarifas como mapa (p1 a p4); si no hay ninguna, todas en 0.
func (p ProductPrices) ToMap() map[string]float64 {
	if p == nil {
		return map[string]float64{"p1": 0, "p2": 0, "p3": 0, "p4": 0}
	}
	return p
}

// ToJSON devuelve las tarifas como JSON, listas para guardar en la base.
func (p ProductPrices) ToJSON() []byte {
	b, _ := json.Marshal(p.ToMap())
	return b
}

type ProductResponse struct {
	ID           int64                     `json:"id"`
	UUID         string                    `json:"uuid"`
	CompanyID    int64                     `json:"companyId"`
	CategoryID   int64                     `json:"categoryId"`
	CategoryName string                    `json:"categoryName,omitempty"`
	BrandID      *int64                    `json:"brandId,omitempty"`
	BrandName    *string                   `json:"brandName,omitempty"`
	ModelID      *int64                    `json:"modelId,omitempty"`
	ModelName    *string                   `json:"modelName,omitempty"`
	Code         string                    `json:"code"`
	Name         string                    `json:"name"`
	Description  *string                   `json:"description,omitempty"`
	Unit         string                    `json:"unit"`
	IVA          *float64                  `json:"iva,omitempty"`
	Prices       ProductPrices             `json:"prices"`
	LastCost     float64                   `json:"lastCost"`
	IsPromotion  bool                      `json:"isPromotion"`
	IsNew        bool                      `json:"isNew"`
	Images       []string                  `json:"images"`
	Easysearch   *string                   `json:"easysearch,omitempty"`
	Status       types.ProductStatus       `json:"status"`
	CreatedAt    time.Time                 `json:"createdAt"`
	UpdatedAt    time.Time                 `json:"updatedAt"`
	Codes        []ProductCodeResponse     `json:"codes,omitempty"`
	Suppliers    []ProductSupplierResponse `json:"suppliers,omitempty"`
}

// InitialStockRequest es dónde se guarda el producto recién creado: la bodega, la ubicación (estante) que ya existe en ella y cuántas unidades hay (puede ser 0 si solo se está asignando el estante).
type InitialStockRequest struct {
	WarehouseID int64  `json:"warehouseId" validate:"required"`
	Location    string `json:"location" validate:"required"`
	Quantity    int    `json:"quantity" validate:"min=0"`
}

type CreateProductRequest struct {
	CompanyID    *int64                `json:"companyId"`
	CategoryID   int64                 `json:"categoryId" validate:"required"`
	BrandID      *int64                `json:"brandId"`
	ModelID      *int64                `json:"modelId"`
	Code         string                `json:"code" validate:"required"`
	Name         string                `json:"name" validate:"required"`
	Description  *string               `json:"description"`
	Unit         string                `json:"unit"`
	IVA          *float64              `json:"iva"`
	Prices       ProductPrices         `json:"prices"`
	LastCost     *float64              `json:"lastCost"`
	IsPromotion  *bool                 `json:"isPromotion"`
	IsNew        *bool                 `json:"isNew"`
	Images       []string              `json:"images"`
	Status       *types.ProductStatus  `json:"status"`
	InitialStock []InitialStockRequest `json:"initialStock"` // opcional: dónde queda guardado en una o varias bodegas
}

type UpdateProductRequest struct {
	CategoryID       *int64               `json:"categoryId"`
	BrandID          *int64               `json:"brandId"`
	ModelID          *int64               `json:"modelId"`
	Code             *string              `json:"code"`
	Name             *string              `json:"name"`
	Description      *string              `json:"description"`
	Unit             *string              `json:"unit"`
	IVA              *float64             `json:"iva"`
	Prices           *ProductPrices       `json:"prices"`
	LastCost         *float64             `json:"lastCost"`
	IsPromotion      *bool                `json:"isPromotion"`
	IsNew            *bool                `json:"isNew"`
	Images           []string             `json:"images"`
	Status           *types.ProductStatus `json:"status"`
	ExpectedVersion  *string              `json:"expectedVersion,omitempty"`
	Reason           string               `json:"reason"` // obligatorio (10 a 100) si pasa a inactivo o descontinuado
}

type DeleteProductRequest struct {
	Reason string `json:"reason"`
}

type ProductFilterQuery struct {
	CompanyID   *int64
	CategoryID  *int64
	BrandID     *int64
	ModelID     *int64
	Status      *types.ProductStatus
	IsPromotion *bool
	Search      string
	Page        int
	PageSize    int
}

// ==========================================
// DTOs PARA CÓDIGOS DE PRODUCTO
// ==========================================

type ProductCodeResponse struct {
	ID        int64                 `json:"id"`
	ProductID int64                 `json:"productId"`
	CodeType  types.ProductCodeType `json:"codeType"`
	Code      string                `json:"code"`
}

type CreateProductCodeRequest struct {
	CodeType types.ProductCodeType `json:"codeType" validate:"required"`
	Code     string                `json:"code" validate:"required"`
}

// ==========================================
// DTOs PARA PROVEEDORES DE PRODUCTO
// ==========================================

type ProductSupplierResponse struct {
	ProductID    int64   `json:"productId"`
	SupplierID   int64   `json:"supplierId"`
	SupplierName string  `json:"supplierName"`
	Cost         float64 `json:"cost"`
	SupplierCode *string `json:"supplierCode,omitempty"`
}

type AssignProductSupplierRequest struct {
	SupplierID   int64   `json:"supplierId" validate:"required"`
	Cost         float64 `json:"cost" validate:"required,min=0"`
	SupplierCode *string `json:"supplierCode"`
}

// ProductThumbnailResponse es la primera imagen de un producto (para los renglones de pedidos, cotizaciones, compras y traslados).
type ProductThumbnailResponse struct {
	ID       int64  `json:"id"`
	ImageURL string `json:"imageUrl"`
}
