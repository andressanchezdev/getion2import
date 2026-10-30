package dtos

import (
	"time"

	"importadoraApi/src/core/types"
)

// ==========================================
// DTOs PARA ADMINS
// ==========================================

type AdminResponse struct {
	ID                   int64              `json:"id"`
	CompanyID            int64              `json:"companyId"`
	CompanyName          string             `json:"companyName,omitempty"`
	EmployeeID           *int64             `json:"employeeId,omitempty"`
	CreatedBySuperadminID *int64            `json:"createdBySuperadminId,omitempty"`
	Email                string             `json:"email"`
	FirstName            string             `json:"firstName"`
	LastName             string             `json:"lastName"`
	FullName             string             `json:"fullName"`
	DocumentType         types.DocumentType `json:"documentType"`
	Document             *string            `json:"document,omitempty"`
	Phone                *string            `json:"phone,omitempty"`
	IsActive             bool               `json:"isActive"`
	LastLoginAt          *time.Time         `json:"lastLoginAt,omitempty"`
	CreatedAt            time.Time          `json:"createdAt"`
	UpdatedAt            time.Time          `json:"updatedAt"`
}

type CreateAdminRequest struct {
	CompanyID    int64              `json:"companyId" validate:"required"`
	Email        string             `json:"email" validate:"required,email"`
	Password     string             `json:"password" validate:"required,min=8"`
	FirstName    string             `json:"firstName" validate:"required"`
	LastName     string             `json:"lastName"`
	DocumentType types.DocumentType `json:"documentType"`
	Document     *string            `json:"document"`
	Phone        *string            `json:"phone"`
	EmployeeID   *int64             `json:"employeeId"`
}

type UpdateAdminRequest struct {
	FirstName    *string             `json:"firstName"`
	LastName     *string             `json:"lastName"`
	DocumentType *types.DocumentType `json:"documentType"`
	Document     *string             `json:"document"`
	Phone        *string             `json:"phone"`
	IsActive     *bool               `json:"isActive"`
	Password     *string             `json:"password"`
}

type AdminFilterQuery struct {
	CompanyID *int64
	IsActive  *bool
	Search    string
	Page      int
	PageSize  int
}

// ==========================================
// DTOs PARA ROLES
// ==========================================

type RoleResponse struct {
	ID          int64     `json:"id"`
	CompanyID   int64     `json:"companyId"`
	Code        string    `json:"code"`
	Name        string    `json:"name"`
	Description *string   `json:"description,omitempty"`
	IsActive    bool      `json:"isActive"`
	CreatedAt   time.Time `json:"createdAt"`
}

type CreateRoleRequest struct {
	CompanyID   *int64  `json:"companyId"`
	Code        string  `json:"code" validate:"required"`
	Name        string  `json:"name" validate:"required"`
	Description *string `json:"description"`
}

type UpdateRoleRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	IsActive    *bool   `json:"isActive"`
}

// ==========================================
// DTOs PARA PERMISOS
// ==========================================

type PermissionResponse struct {
	ID          int64   `json:"id"`
	Module      string  `json:"module"`
	Action      string  `json:"action"`
	Description *string `json:"description,omitempty"`
}

type AssignEmployeePermissionsRequest struct {
	PermissionIDs []int64 `json:"permissionIds" validate:"required"`
}

// ==========================================
// DTOs PARA EMPLEADOS
// ==========================================

type EmployeeResponse struct {
	ID               int64                  `json:"id"`
	CompanyID        int64                  `json:"companyId"`
	RoleID           int64                  `json:"roleId"`
	RoleName         string                 `json:"roleName,omitempty"`
	WarehouseID      *int64                 `json:"warehouseId,omitempty"`
	WarehouseName    *string                `json:"warehouseName,omitempty"`
	Email            string                 `json:"email"`
	FirstName        string                 `json:"firstName"`
	LastName         string                 `json:"lastName"`
	FullName         string                 `json:"fullName"`
	DocumentType     types.DocumentType     `json:"documentType"`
	Document         *string                `json:"document,omitempty"`
	Phone            *string                `json:"phone,omitempty"`
	Address          *string                `json:"address,omitempty"`
	PhotoURL         *string                `json:"photoUrl,omitempty"`
	WorkModality     types.WorkModality     `json:"workModality"`
	EmploymentStatus types.EmploymentStatus `json:"employmentStatus"`
	Status           types.EmployeeStatus   `json:"status"`
	LastLoginAt      *time.Time             `json:"lastLoginAt,omitempty"`
	CreatedAt        time.Time              `json:"createdAt"`
	UpdatedAt        time.Time              `json:"updatedAt"`
	Permissions      []PermissionResponse   `json:"permissions,omitempty"`
}

type CreateEmployeeRequest struct {
	CompanyID          *int64                 `json:"companyId"`
	RoleID             int64                  `json:"roleId" validate:"required"`
	WarehouseID        *int64                 `json:"warehouseId"`
	Email              string                 `json:"email" validate:"required,email"`
	Password           string                 `json:"password" validate:"required,min=8"`
	FirstName          string                 `json:"firstName" validate:"required"`
	LastName           string                 `json:"lastName"`
	DocumentType       types.DocumentType     `json:"documentType"`
	Document           *string                `json:"document"`
	Phone              *string                `json:"phone"`
	Address            *string                `json:"address"`
	PhotoURL           *string                `json:"photoUrl"`
	WorkModality       types.WorkModality     `json:"workModality"`
	EmploymentStatus   types.EmploymentStatus `json:"employmentStatus"`
	InitialPermissions []int64                `json:"initialPermissions"`
}

type UpdateEmployeeRequest struct {
	RoleID           *int64                  `json:"roleId"`
	WarehouseID      *int64                  `json:"warehouseId"`
	FirstName        *string                 `json:"firstName"`
	LastName         *string                 `json:"lastName"`
	DocumentType     *types.DocumentType     `json:"documentType"`
	Document         *string                 `json:"document"`
	Phone            *string                 `json:"phone"`
	Address          *string                 `json:"address"`
	PhotoURL         *string                 `json:"photoUrl"`
	WorkModality     *types.WorkModality     `json:"workModality"`
	EmploymentStatus *types.EmploymentStatus `json:"employmentStatus"`
	Status           *types.EmployeeStatus   `json:"status"`
}

type UpdateCredentialsRequest struct {
	Password string `json:"password" validate:"required,min=8"`
}

type EmployeeFilterQuery struct {
	CompanyID   *int64
	RoleID      *int64
	WarehouseID *int64
	Status      *string
	Search      string
	Page        int
	PageSize    int
}

type SalespersonResponse struct {
	ID            int64   `json:"id"`
	FullName      string  `json:"fullName"`
	Email         string  `json:"email"`
	Phone         *string `json:"phone,omitempty"`
	RoleName      string  `json:"roleName"`
	WarehouseID   *int64  `json:"warehouseId,omitempty"`
	WarehouseName *string `json:"warehouseName,omitempty"`
}

type UnlockEmployeeResponse struct {
	EmployeeID int64     `json:"employeeId"`
	Email      string    `json:"email"`
	Message    string    `json:"message"`
	UnlockedAt time.Time `json:"unlockedAt"`
}

