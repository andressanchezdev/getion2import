package dtos

import "time"

// CompanyResponse representa los datos públicos de una compañía.
type CompanyResponse struct {
	ID                    int64      `json:"id"`
	CreatedBySuperadminID *int64     `json:"createdBySuperadminId,omitempty"`
	Name                  string     `json:"name"`
	Email                 string     `json:"email"`
	Phone                 string     `json:"phone"`
	Address               string     `json:"address"`
	City                  string     `json:"city"`
	LogoURL               string     `json:"logoUrl"`
	IsActive              bool       `json:"isActive"`
	CreatedAt             time.Time  `json:"createdAt"`
	UpdatedAt             time.Time  `json:"updatedAt"`
	DeletedAt             *time.Time `json:"deletedAt,omitempty"`
}

// CreateCompanyRequest entrada de POST /companies.
type CreateCompanyRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email,omitempty"`
	Phone    string `json:"phone,omitempty"`
	Address  string `json:"address,omitempty"`
	City     string `json:"city,omitempty"`
	LogoURL  string `json:"logoUrl,omitempty"`
	IsActive *bool  `json:"isActive,omitempty"`
}

// UpdateCompanyRequest entrada de PUT /companies/:id.
type UpdateCompanyRequest struct {
	Name     *string `json:"name,omitempty"`
	Email    *string `json:"email,omitempty"`
	Phone    *string `json:"phone,omitempty"`
	Address  *string `json:"address,omitempty"`
	City     *string `json:"city,omitempty"`
	LogoURL  *string `json:"logoUrl,omitempty"`
	IsActive *bool   `json:"isActive,omitempty"`
}

// CompanySearchQuery parámetros de búsqueda para GET /companies/search.
type CompanySearchQuery struct {
	Query string `query:"q"`
}

