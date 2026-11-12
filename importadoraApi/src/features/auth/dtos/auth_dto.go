package dtos

// auth_dto.go · formas de lo que entra y sale por la API en autenticación y sesiones (peticiones y respuestas)
// conecta con: los controllers y services de autenticación y sesiones

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

// Token devuelve el token de renovación que llegó, sin importar con qué nombre de campo se envió.
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

// Token devuelve el token de renovación que llegó, sin importar con qué nombre de campo se envió.
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

// UpdateMeRequest entrada de PUT /auth/me para actualizar datos del propio actor.
type UpdateMeRequest struct {
	FirstName       string  `json:"firstName" validate:"required,min=2,max=100"`
	LastName        string  `json:"lastName" validate:"max=100"`
	Email           string  `json:"email" validate:"required,email"`
	Phone           *string `json:"phone" validate:"omitempty,max=30"` // ojo: nil conserva el teléfono guardado; "" lo borra
	ExpectedVersion *string `json:"expectedVersion,omitempty"`
}

// UpdatePasswordRequest entrada de PUT /auth/me/password para cambio seguro de contraseña.
type UpdatePasswordRequest struct {
	CurrentPassword string `json:"currentPassword" validate:"required"`
	NewPassword     string `json:"newPassword" validate:"required,min=8"`
}

