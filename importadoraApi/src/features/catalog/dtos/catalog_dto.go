package dtos

import "time"

// ==========================================
// DTOs PARA MARCAS (BRANDS)
// ==========================================

type BrandResponse struct {
	ID        int64     `json:"id"`
	CompanyID int64     `json:"companyId"`
	Name      string    `json:"name"`
	ImageURL  *string   `json:"imageUrl,omitempty"`
	IsActive  bool      `json:"isActive"`
	CreatedAt time.Time `json:"createdAt"`
}

type CreateBrandRequest struct {
	CompanyID *int64  `json:"companyId"`
	Name      string  `json:"name" validate:"required"`
	ImageURL  *string `json:"imageUrl"`
	IsActive  *bool   `json:"isActive"`
}

type UpdateBrandRequest struct {
	Name     *string `json:"name"`
	ImageURL *string `json:"imageUrl"`
	IsActive *bool   `json:"isActive"`
}

// ==========================================
// DTOs PARA MODELOS (MODELS)
// ==========================================

type ModelResponse struct {
	ID          int64     `json:"id"`
	CompanyID   int64     `json:"companyId"`
	Name        string    `json:"name"`
	Description *string   `json:"description,omitempty"`
	IsActive    bool      `json:"isActive"`
	CreatedAt   time.Time `json:"createdAt"`
}

type CreateModelRequest struct {
	CompanyID   *int64  `json:"companyId"`
	Name        string  `json:"name" validate:"required"`
	Description *string `json:"description"`
	IsActive    *bool   `json:"isActive"`
}

type UpdateModelRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	IsActive    *bool   `json:"isActive"`
}

// ==========================================
// DTOs PARA CATEGORÍAS (CATEGORIES)
// ==========================================

type CategoryResponse struct {
	ID          int64              `json:"id"`
	CompanyID   int64              `json:"companyId"`
	ParentID    *int64             `json:"parentId,omitempty"`
	ParentName  *string            `json:"parentName,omitempty"`
	Name        string             `json:"name"`
	Description *string            `json:"description,omitempty"`
	IsActive    bool               `json:"isActive"`
	CreatedAt   time.Time          `json:"createdAt"`
	Children    []CategoryResponse `json:"children,omitempty"`
}

type CreateCategoryRequest struct {
	CompanyID   *int64  `json:"companyId"`
	ParentID    *int64  `json:"parentId"`
	Name        string  `json:"name" validate:"required"`
	Description *string `json:"description"`
	IsActive    *bool   `json:"isActive"`
}

type UpdateCategoryRequest struct {
	ParentID    *int64  `json:"parentId"`
	Name        *string `json:"name"`
	Description *string `json:"description"`
	IsActive    *bool   `json:"isActive"`
}

