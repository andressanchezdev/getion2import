package dtos

import (
	"time"

	"importadoraApi/src/core/types"
)

// LoginRequest entrada de POST /auth/login.
type LoginRequest struct {
	Email     string          `json:"email"`
	Password  string          `json:"password"`
	ActorType types.ActorType `json:"actorType,omitempty"`
	Device    string          `json:"device,omitempty"`
}

// RefreshRequest entrada de POST /auth/refresh.
type RefreshRequest struct {
	RefreshToken    string `json:"refresh_token"`
	RefreshTokenAlt string `json:"refreshToken"`
	Device          string `json:"device,omitempty"`
}

func (r RefreshRequest) Token() string {
	if r.RefreshToken != "" {
		return r.RefreshToken
	}
	return r.RefreshTokenAlt
}

// LogoutRequest entrada opcional de POST /auth/logout.
type LogoutRequest struct {
	RefreshToken    string `json:"refresh_token,omitempty"`
	RefreshTokenAlt string `json:"refreshToken,omitempty"`
	AllSessions     bool   `json:"allSessions,omitempty"`
}

func (r LogoutRequest) Token() string {
	if r.RefreshToken != "" {
		return r.RefreshToken
	}
	return r.RefreshTokenAlt
}

// PermissionDTO representa un permiso habilitado del catálogo maestro permissions.
type PermissionDTO struct {
	ID          int64  `json:"id"`
	Module      string `json:"module"`
	Action      string `json:"action"`
	Key         string `json:"key"`
	Description string `json:"description,omitempty"`
}

// AuthActorDTO unifica el perfil seguro (sin password_hash) del actor autenticado.
type AuthActorDTO struct {
	ID               int64           `json:"id"`
	ActorType        types.ActorType `json:"actorType"`
	Email            string          `json:"email"`
	Username         string          `json:"username,omitempty"`
	FirstName        string          `json:"firstName"`
	LastName         string          `json:"lastName"`
	FullName         string          `json:"fullName"`
	Phone            string          `json:"phone,omitempty"`
	DocumentType     string          `json:"documentType,omitempty"`
	Document         string          `json:"document,omitempty"`
	Address          string          `json:"address,omitempty"`
	PhotoURL         string          `json:"photoUrl,omitempty"`
	AccessLevel      string          `json:"accessLevel,omitempty"`
	EmployeeID       *int64          `json:"employeeId,omitempty"`
	CompanyID        *int64          `json:"companyId,omitempty"`
	CompanyName      string          `json:"companyName,omitempty"`
	WarehouseID      *int64          `json:"warehouseId,omitempty"`
	WarehouseCode    string          `json:"warehouseCode,omitempty"`
	WarehouseName    string          `json:"warehouseName,omitempty"`
	RoleID           *int64          `json:"roleId,omitempty"`
	RoleCode         string          `json:"roleCode,omitempty"`
	RoleName         string          `json:"roleName,omitempty"`
	WorkModality     string          `json:"workModality,omitempty"`
	EmploymentStatus string          `json:"employmentStatus,omitempty"`
	Status           string          `json:"status"`
	LastLoginAt      *time.Time      `json:"lastLoginAt,omitempty"`
}

// AuthTokensResponse salida unificada de POST /auth/login y POST /auth/refresh.
type AuthTokensResponse struct {
	AccessToken  string          `json:"access_token"`
	RefreshToken string          `json:"refresh_token"`
	ExpiresInSec int64           `json:"expiresIn"`
	ActorType    types.ActorType `json:"actorType"`
	Actor        AuthActorDTO    `json:"actor"`
	Permissions  []PermissionDTO `json:"permissions"`
}

// AuthMeResponse salida de GET /auth/me.
type AuthMeResponse struct {
	ActorType   types.ActorType `json:"actorType"`
	Actor       AuthActorDTO    `json:"actor"`
	Permissions []PermissionDTO `json:"permissions"`
}

