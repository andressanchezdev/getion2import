package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"importadoraApi/src/core/config"
	"importadoraApi/src/core/db"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/auth/dtos"
	"importadoraApi/src/features/auth/repositories"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AuthService struct {
	cfg       *config.Config
	pool      *pgxpool.Pool
	authRepo  *repositories.AuthRepository
	auditRepo *repositories.AuditRepository
}

func NewAuthService(
	cfg *config.Config,
	pool *pgxpool.Pool,
	authRepo *repositories.AuthRepository,
	auditRepo *repositories.AuditRepository,
) *AuthService {
	return &AuthService{
		cfg:       cfg,
		pool:      pool,
		authRepo:  authRepo,
		auditRepo: auditRepo,
	}
}

// Login valida credenciales, aplica bloqueo en employee_login_attempts si corresponde,
// emite tokens JWT y genera el registro en audit_logs.
func (s *AuthService) Login(ctx context.Context, req dtos.LoginRequest, ip, userAgent string) (*dtos.AuthTokensResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email == "" || strings.TrimSpace(req.Password) == "" {
		return nil, utils.BadRequest("MISSING_CREDENTIALS", "Email y contraseña son obligatorios.")
	}

	acc, err := s.authRepo.ResolveActorByEmail(ctx, s.pool, email, req.ActorType)
	if err != nil {
		return nil, utils.Unauthorized("INVALID_CREDENTIALS", "Credenciales incorrectas.")
	}

	// Si es empleado, validar bloqueos por intentos fallidos
	if acc.ActorType == types.ActorEmployee {
		attempt, err := s.authRepo.GetEmployeeLoginAttempt(ctx, s.pool, acc.ID, acc.Email)
		if err == nil && attempt != nil && attempt.BlockedUntil != nil {
			if attempt.BlockedUntil.After(time.Now().UTC()) {
				remaining := time.Until(*attempt.BlockedUntil).Round(time.Second)
				return nil, utils.Forbidden("ACCOUNT_BLOCKED", fmt.Sprintf("Demasiados intentos fallidos. Cuenta bloqueada por %s.", remaining))
			}
		}
	}

	// Validar estado activo de la cuenta y su compañía
	if !acc.IsActive {
		return nil, utils.Forbidden("ACCOUNT_INACTIVE", "La cuenta se encuentra inactiva o deshabilitada.")
	}
	if !acc.CompanyIsActive {
		return nil, utils.Forbidden("COMPANY_INACTIVE", "La compañía asociada a esta cuenta se encuentra inactiva.")
	}

	// Verificar contraseña con bcrypt
	if !utils.CheckPassword(acc.PasswordHash, req.Password) {
		if acc.ActorType == types.ActorEmployee {
			count, blockedUntil, _ := s.authRepo.RecordFailedEmployeeLogin(
				ctx, s.pool, acc.ID, acc.Email, ip, s.cfg.LoginMaxAttempts, s.cfg.LoginBlockDuration,
			)
			if blockedUntil != nil {
				return nil, utils.Forbidden("ACCOUNT_BLOCKED", "Has alcanzado el límite de intentos. Cuenta bloqueada temporalmente.")
			}
			remaining := s.cfg.LoginMaxAttempts - count
			return nil, utils.Unauthorized("INVALID_CREDENTIALS", fmt.Sprintf("Credenciales incorrectas. Intentos restantes: %d", remaining))
		}
		return nil, utils.Unauthorized("INVALID_CREDENTIALS", "Credenciales incorrectas.")
	}

	// Resetear intentos de login fallidos
	if acc.ActorType == types.ActorEmployee {
		_ = s.authRepo.ResetEmployeeLoginAttempts(ctx, s.pool, acc.ID, acc.Email, ip)
	}
	_ = s.authRepo.TouchLastLogin(ctx, s.pool, acc.ActorType, acc.ID)

	// Crear refresh_token en la base de datos
	rawRefreshToken, err := utils.GenerateOpaqueToken(32)
	if err != nil {
		return nil, utils.Internal("Error al generar token de sesión.", err)
	}
	tokenHash := utils.SHA256Hex(rawRefreshToken)
	expiresAt := time.Now().UTC().Add(s.cfg.JWTRefreshTTL)

	sessionID, err := s.authRepo.CreateRefreshToken(ctx, s.pool, acc.ActorType, acc.ID, tokenHash, req.Device, ip, expiresAt)
	if err != nil {
		return nil, utils.Internal("Error al registrar sesión activa.", err)
	}

	// Firmar JWT access_token con el sessionID para posibilitar revocación instantánea
	accessToken, err := utils.SignAccessToken(
		s.cfg.JWTSecret,
		s.cfg.JWTAccessTTL,
		acc.ActorType,
		acc.ID,
		acc.CompanyID,
		acc.WarehouseID,
		acc.RoleID,
		sessionID,
		acc.Email,
	)
	if err != nil {
		return nil, utils.Internal("Error al firmar token de acceso.", err)
	}

	// Cargar catálogo de permisos asignados
	permRecords, _ := s.authRepo.LoadPermissionsForActor(ctx, s.pool, acc.ActorType, acc.ID)
	permsDTO := make([]dtos.PermissionDTO, 0, len(permRecords))
	for _, p := range permRecords {
		permsDTO = append(permsDTO, dtos.PermissionDTO{
			ID:          p.ID,
			Module:      p.Module,
			Action:      p.Action,
			Key:         p.Module + ":" + p.Action,
			Description: p.Description,
		})
	}

	// Registrar en audit_logs
	_ = s.auditRepo.Insert(ctx, s.pool, repositories.AuditLogInput{
		CompanyID: acc.CompanyID,
		ActorType: acc.ActorType,
		ActorID:   acc.ID,
		Entity:    "auth",
		EntityID:  &acc.ID,
		Action:    "LOGIN_SUCCESS",
		Reason:    "Inicio de sesión exitoso",
		IPAddress: ip,
		UserAgent: userAgent,
	})

	return &dtos.AuthTokensResponse{
		AccessToken:  accessToken,
		RefreshToken: rawRefreshToken,
		ExpiresInSec: int64(s.cfg.JWTAccessTTL.Seconds()),
		ActorType:    acc.ActorType,
		Actor:        s.mapActorToDTO(acc),
		Permissions:  permsDTO,
	}, nil
}

// Refresh rota el refresh_token y emite un nuevo access_token.
func (s *AuthService) Refresh(ctx context.Context, req dtos.RefreshRequest, ip, userAgent string) (*dtos.AuthTokensResponse, error) {
	rawToken := strings.TrimSpace(req.Token())
	if rawToken == "" {
		return nil, utils.BadRequest("MISSING_TOKEN", "El refresh_token es obligatorio.")
	}

	tokenHash := utils.SHA256Hex(rawToken)
	activeRec, err := s.authRepo.FindActiveRefreshTokenByHash(ctx, s.pool, tokenHash)
	if err != nil {
		return nil, utils.Unauthorized("INVALID_REFRESH_TOKEN", "El token de renovación es inválido o expiró.")
	}

	var (
		actorType types.ActorType
		actorID   int64
	)
	if activeRec.EmployeeID != nil {
		actorType = types.ActorEmployee
		actorID = *activeRec.EmployeeID
	} else if activeRec.AdminID != nil {
		actorType = types.ActorAdmin
		actorID = *activeRec.AdminID
	} else if activeRec.SuperadminID != nil {
		actorType = types.ActorSuperadmin
		actorID = *activeRec.SuperadminID
	}

	acc, err := s.authRepo.FindActorByID(ctx, s.pool, actorType, actorID)
	if err != nil || !acc.IsActive || !acc.CompanyIsActive {
		_ = s.authRepo.RevokeRefreshTokenByID(ctx, s.pool, activeRec.ID)
		return nil, utils.Unauthorized("ACCOUNT_INACTIVE", "La cuenta o compañía ya no está activa.")
	}

	newRawRefreshToken, err := utils.GenerateOpaqueToken(32)
	if err != nil {
		return nil, utils.Internal("Error al generar nuevo refresh token.", err)
	}
	newTokenHash := utils.SHA256Hex(newRawRefreshToken)
	expiresAt := time.Now().UTC().Add(s.cfg.JWTRefreshTTL)

	var newSessionID int64
	err = db.WithTx(ctx, s.pool, func(tx pgx.Tx) error {
		if err := s.authRepo.RevokeRefreshTokenByID(ctx, tx, activeRec.ID); err != nil {
			return err
		}
		id, err := s.authRepo.CreateRefreshToken(ctx, tx, acc.ActorType, acc.ID, newTokenHash, req.Device, ip, expiresAt)
		if err != nil {
			return err
		}
		newSessionID = id
		return nil
	})
	if err != nil {
		return nil, utils.Internal("Error al rotar la sesión.", err)
	}

	newAccessToken, err := utils.SignAccessToken(
		s.cfg.JWTSecret,
		s.cfg.JWTAccessTTL,
		acc.ActorType,
		acc.ID,
		acc.CompanyID,
		acc.WarehouseID,
		acc.RoleID,
		newSessionID,
		acc.Email,
	)
	if err != nil {
		return nil, utils.Internal("Error al firmar nuevo token de acceso.", err)
	}

	permRecords, _ := s.authRepo.LoadPermissionsForActor(ctx, s.pool, acc.ActorType, acc.ID)
	permsDTO := make([]dtos.PermissionDTO, 0, len(permRecords))
	for _, p := range permRecords {
		permsDTO = append(permsDTO, dtos.PermissionDTO{
			ID:          p.ID,
			Module:      p.Module,
			Action:      p.Action,
			Key:         p.Module + ":" + p.Action,
			Description: p.Description,
		})
	}

	return &dtos.AuthTokensResponse{
		AccessToken:  newAccessToken,
		RefreshToken: newRawRefreshToken,
		ExpiresInSec: int64(s.cfg.JWTAccessTTL.Seconds()),
		ActorType:    acc.ActorType,
		Actor:        s.mapActorToDTO(acc),
		Permissions:  permsDTO,
	}, nil
}

// Logout invalida de inmediato la sesión en refresh_tokens.
func (s *AuthService) Logout(ctx context.Context, sessionID int64, actorType types.ActorType, actorID int64, rawRefreshToken string, allSessions bool) error {
	if allSessions {
		return s.authRepo.RevokeAllActorSessions(ctx, s.pool, actorType, actorID)
	}

	if sessionID > 0 {
		_ = s.authRepo.RevokeRefreshTokenByID(ctx, s.pool, sessionID)
	}

	if rawRefreshToken != "" {
		tokenHash := utils.SHA256Hex(rawRefreshToken)
		_ = s.authRepo.RevokeRefreshTokenByHash(ctx, s.pool, tokenHash)
	}

	return nil
}

// GetMe devuelve el perfil seguro completo del actor con sus permisos habilitados.
func (s *AuthService) GetMe(ctx context.Context, actorType types.ActorType, actorID int64) (*dtos.AuthMeResponse, error) {
	acc, err := s.authRepo.FindActorByID(ctx, s.pool, actorType, actorID)
	if err != nil {
		return nil, utils.NotFound("ACTOR_NOT_FOUND", "No se encontró el perfil del usuario autenticado.")
	}

	permRecords, _ := s.authRepo.LoadPermissionsForActor(ctx, s.pool, acc.ActorType, acc.ID)
	permsDTO := make([]dtos.PermissionDTO, 0, len(permRecords))
	for _, p := range permRecords {
		permsDTO = append(permsDTO, dtos.PermissionDTO{
			ID:          p.ID,
			Module:      p.Module,
			Action:      p.Action,
			Key:         p.Module + ":" + p.Action,
			Description: p.Description,
		})
	}

	return &dtos.AuthMeResponse{
		ActorType:   acc.ActorType,
		Actor:       s.mapActorToDTO(acc),
		Permissions: permsDTO,
	}, nil
}

func (s *AuthService) mapActorToDTO(acc *repositories.ActorAccount) dtos.AuthActorDTO {
	return dtos.AuthActorDTO{
		ID:               acc.ID,
		ActorType:        acc.ActorType,
		Email:            acc.Email,
		Username:         acc.Username,
		FirstName:        acc.FirstName,
		LastName:         acc.LastName,
		FullName:         acc.FullName,
		Phone:            acc.Phone,
		DocumentType:     acc.DocumentType,
		Document:         acc.Document,
		Address:          acc.Address,
		PhotoURL:         acc.PhotoURL,
		AccessLevel:      acc.AccessLevel,
		EmployeeID:       acc.LinkedEmployeeID,
		CompanyID:        acc.CompanyID,
		CompanyName:      acc.CompanyName,
		WarehouseID:      acc.WarehouseID,
		WarehouseCode:    acc.WarehouseCode,
		WarehouseName:    acc.WarehouseName,
		RoleID:           acc.RoleID,
		RoleCode:         acc.RoleCode,
		RoleName:         acc.RoleName,
		WorkModality:     acc.WorkModality,
		EmploymentStatus: acc.EmploymentStatus,
		Status:           acc.Status,
		LastLoginAt:      acc.LastLoginAt,
	}
}
