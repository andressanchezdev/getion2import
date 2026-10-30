package dtos

import (
	"encoding/json"
	"time"

	"importadoraApi/src/core/types"
)

// ==========================================
// DTOs PARA PRODUCTOS
// ==========================================

type ProductPrices map[string]float64

func (p ProductPrices) ToMap() map[string]float64 {
	if p == nil {
		return map[string]float64{"p1": 0, "p2": 0, "p3": 0, "p4": 0}
	}
	return p
}

func (p ProductPrices) ToJSON() []byte {
	b, _ := json.Marshal(p.ToMap())
	return b
}

type ProductResponse struct {
	ID           int64                    `json:"id"`
	UUID         string                   `json:"uuid"`
	CompanyID    int64                    `json:"companyId"`
	CategoryID   int64                    `json:"categoryId"`
	CategoryName string                   `json:"categoryName,omitempty"`
	BrandID      *int64                   `json:"brandId,omitempty"`
	BrandName    *string                  `json:"brandName,omitempty"`
	ModelID      *int64                   `json:"modelId,omitempty"`
	ModelName    *string                  `json:"modelName,omitempty"`
	Code         string                   `json:"code"`
	Name         string                   `json:"name"`
	Description  *string                  `json:"description,omitempty"`
	Unit         string                   `json:"unit"`
	IVA          *float64                 `json:"iva,omitempty"`
	Prices       ProductPrices            `json:"prices"`
	LastCost     float64                  `json:"lastCost"`
	IsPromotion  bool                     `json:"isPromotion"`
	Images       []string                 `json:"images"`
	Easysearch   *string                  `json:"easysearch,omitempty"`
	Status       types.ProductStatus      `json:"status"`
	CreatedAt    time.Time                `json:"createdAt"`
	UpdatedAt    time.Time                `json:"updatedAt"`
	Codes        []ProductCodeResponse    `json:"codes,omitempty"`
	Suppliers    []ProductSupplierResponse `json:"suppliers,omitempty"`
}

type CreateProductRequest struct {
	CompanyID   *int64               `json:"companyId"`
	CategoryID  int64                `json:"categoryId" validate:"required"`
	BrandID     *int64               `json:"brandId"`
	ModelID     *int64               `json:"modelId"`
	Code        string               `json:"code" validate:"required"`
	Name        string               `json:"name" validate:"required"`
	Description *string              `json:"description"`
	Unit        string               `json:"unit"`
	IVA         *float64             `json:"iva"`
	Prices      ProductPrices        `json:"prices"`
	LastCost    *float64             `json:"lastCost"`
	IsPromotion *bool                `json:"isPromotion"`
	Images      []string             `json:"images"`
	Status      *types.ProductStatus `json:"status"`
}

type UpdateProductRequest struct {
	CategoryID  *int64               `json:"categoryId"`
	BrandID     *int64               `json:"brandId"`
	ModelID     *int64               `json:"modelId"`
	Code        *string              `json:"code"`
	Name        *string              `json:"name"`
	Description *string              `json:"description"`
	Unit        *string              `json:"unit"`
	IVA         *float64             `json:"iva"`
	Prices      *ProductPrices       `json:"prices"`
	LastCost    *float64             `json:"lastCost"`
	IsPromotion *bool                `json:"isPromotion"`
	Images      []string             `json:"images"`
	Status      *types.ProductStatus `json:"status"`
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

