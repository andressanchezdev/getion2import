package services

// auth_service.go · reglas de negocio de autenticación y sesiones: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas
// conecta con: los repositories y dtos de autenticación y sesiones; los llama el controller y la conexión llega del contenedor
// nota de seguridad: el bloqueo temporal por intentos fallidos de login (LOGIN_MAX_ATTEMPTS y LOGIN_BLOCK_MINUTES) opera de forma automática y vence únicamente por expiración de tiempo. No depende de ninguna acción manual externa.

import (
	"context"
	"fmt"
	"strings"
	"time"

	"importadoraApi/src/core/config"
	"importadoraApi/src/core/db"
	"importadoraApi/src/core/events"
	"importadoraApi/src/core/middlewares"
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
	events    *events.Recorder
}

// NewAuthService crea el servicio con las piezas que necesita para funcionar.
func NewAuthService(
	cfg *config.Config,
	pool *pgxpool.Pool,
	authRepo *repositories.AuthRepository,
	auditRepo *repositories.AuditRepository,
	events *events.Recorder,
) *AuthService {
	return &AuthService{
		cfg:       cfg,
		pool:      pool,
		authRepo:  authRepo,
		auditRepo: auditRepo,
		events:    events,
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
	if acc.ActorType == types.ActorEmployee && !acc.WarehouseIsActive {
		return nil, utils.Forbidden("WAREHOUSE_INACTIVE", "La bodega asociada a esta cuenta no está disponible. Comunícate con el área de desarrollo.")
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
	if err != nil || !acc.IsActive || !acc.CompanyIsActive || (actorType == types.ActorEmployee && !acc.WarehouseIsActive) {
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
	err = db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
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

// Logout invalida de inmediato la sesión en refresh_tokens y emite session.revoked.
func (s *AuthService) Logout(ctx context.Context, companyID *int64, sessionID int64, actorType types.ActorType, actorID int64, rawRefreshToken string, allSessions bool) error {
	return db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		if allSessions {
			if err := s.authRepo.RevokeAllActorSessions(ctx, tx, actorType, actorID); err != nil {
				return err
			}
		} else {
			if sessionID > 0 {
				_ = s.authRepo.RevokeRefreshTokenByID(ctx, tx, sessionID)
			}
			if rawRefreshToken != "" {
				tokenHash := utils.SHA256Hex(rawRefreshToken)
				_ = s.authRepo.RevokeRefreshTokenByHash(ctx, tx, tokenHash)
			}
		}

		if actorID > 0 && string(actorType) != "" {
			if companyID == nil {
				if acc, _ := s.authRepo.FindActorByID(ctx, tx, actorType, actorID); acc != nil {
					companyID = acc.CompanyID
				}
			}
			if s.events != nil {
				var sessPtr *int64
				if !allSessions && sessionID > 0 {
					sessPtr = &sessionID
				}
				s.events.Record(ctx, events.NewSessionRevoked(
					companyID,
					string(actorType),
					actorID,
					sessPtr,
					nil,
					"logout",
				))
			}
		}
		return nil
	})
}

// GetMe devuelve el perfil seguro completo del actor con sus permisos habilitados.
func (s *AuthService) GetMe(ctx context.Context, actorType types.ActorType, actorID int64) (*dtos.AuthMeResponse, error) {
	return s.getMeWithExecutor(ctx, s.pool, actorType, actorID)
}

func (s *AuthService) getMeWithExecutor(ctx context.Context, q db.DBExecutor, actorType types.ActorType, actorID int64) (*dtos.AuthMeResponse, error) {
	acc, err := s.authRepo.FindActorByID(ctx, q, actorType, actorID)
	if err != nil {
		return nil, utils.NotFound("ACTOR_NOT_FOUND", "No se encontró el perfil del usuario autenticado.")
	}

	permRecords, _ := s.authRepo.LoadPermissionsForActor(ctx, q, acc.ActorType, acc.ID)
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

// mapActorToDTO convierte la cuenta de la base en la respuesta que sale por la API.
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

func (s *AuthService) validateExpectedVersionForUpdate(ctx context.Context, tx pgx.Tx, actorType types.ActorType, actorID int64, expectedVersion *string) error {
	if expectedVersion == nil || strings.TrimSpace(*expectedVersion) == "" {
		return nil
	}

	parsed, err := time.Parse(time.RFC3339Nano, *expectedVersion)
	if err != nil {
		parsed, err = time.Parse(time.RFC3339, *expectedVersion)
		if err != nil {
			return utils.BadRequest("INVALID_EXPECTED_VERSION", "expectedVersion debe ser un ISO-8601 válido.")
		}
	}

	current, err := s.authRepo.LoadActorForUpdate(ctx, tx, actorType, actorID)
	if err != nil {
		return utils.NormalizeDBError(err, "No se pudo verificar la versión actual del perfil.")
	}
	if !current.UpdatedAt.UTC().Equal(parsed.UTC()) {
		return utils.StaleVersion("El registro cambió desde que se abrió para editarlo.", current.UpdatedAt.Format(time.RFC3339Nano))
	}
	return nil
}

// UpdateMe actualiza los datos del perfil propio del actor (nombre, apellido, email, teléfono)
func (s *AuthService) UpdateMe(ctx context.Context, actor *middlewares.ActorContext, req dtos.UpdateMeRequest) (*dtos.AuthMeResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Sesión no autenticada")
	}

	acc, err := s.authRepo.FindActorByID(ctx, s.pool, actor.ActorType, actor.ActorID)
	if err != nil || acc == nil {
		return nil, utils.NotFound("ACTOR_NOT_FOUND", "No se encontró el perfil del usuario autenticado.")
	}

	var res *dtos.AuthMeResponse
	err = db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		if err := s.validateExpectedVersionForUpdate(ctx, tx, actor.ActorType, actor.ActorID, req.ExpectedVersion); err != nil {
			return err
		}

		if err := s.authRepo.UpdateActorProfile(ctx, tx, actor.ActorType, actor.ActorID, req.FirstName, req.LastName, req.Email, req.Phone); err != nil {
			return utils.NormalizeDBError(err, "No se pudo actualizar el perfil.")
		}

		// Registrar en auditoría
		_ = s.auditRepo.Insert(ctx, tx, repositories.AuditLogInput{
			CompanyID: acc.CompanyID,
			ActorType: actor.ActorType,
			ActorID:   actor.ActorID,
			Entity:    "auth",
			EntityID:  &actor.ActorID,
			Action:    "auth:update_profile",
			Changes:   map[string]any{"firstName": req.FirstName, "lastName": req.LastName, "email": req.Email},
		})

		updated, err := s.getMeWithExecutor(ctx, tx, actor.ActorType, actor.ActorID)
		if err != nil {
			return err
		}
		res = updated

		if s.events != nil {
			s.events.Record(ctx, events.NewAccountUpdated(
				acc.CompanyID,
				string(actor.ActorType),
				actor.ActorID,
				res,
			))
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return res, nil
}

// UpdatePassword actualiza la contraseña validando la contraseña actual y revocando otras sesiones
func (s *AuthService) UpdatePassword(ctx context.Context, actor *middlewares.ActorContext, req dtos.UpdatePasswordRequest) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Sesión no autenticada")
	}

	acc, err := s.authRepo.FindActorByID(ctx, s.pool, actor.ActorType, actor.ActorID)
	if err != nil || acc == nil {
		return utils.NotFound("ACTOR_NOT_FOUND", "No se encontró el perfil del usuario autenticado.")
	}

	// Verificar contraseña actual con bcrypt
	if !utils.CheckPassword(acc.PasswordHash, req.CurrentPassword) {
		return utils.BadRequest("INVALID_CURRENT_PASSWORD", "La contraseña actual es incorrecta.")
	}

	// Generar nuevo hash
	newHash, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		return utils.Internal("Error al encriptar la nueva contraseña.", err)
	}

	return db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		if err := s.authRepo.UpdateActorPassword(ctx, tx, actor.ActorType, actor.ActorID, newHash); err != nil {
			return utils.NormalizeDBError(err, "No se pudo actualizar la contraseña.")
		}

		// Cierra las demás sesiones del actor; la actual sigue viva para no sacarlo al guardar
		if err := s.authRepo.RevokeOtherActorSessions(ctx, tx, actor.ActorType, actor.ActorID, actor.SessionID); err != nil {
			return utils.Internal("Error al revocar otras sesiones.", err)
		}

		// Registrar en auditoría
		_ = s.auditRepo.Insert(ctx, tx, repositories.AuditLogInput{
			CompanyID: acc.CompanyID,
			ActorType: actor.ActorType,
			ActorID:   actor.ActorID,
			Entity:    "auth",
			EntityID:  &actor.ActorID,
			Action:    "auth:change_password",
			Changes:   map[string]any{"status": "password_changed_sessions_revoked"},
		})

		if s.events != nil {
			var exceptSess *int64
			if actor.SessionID > 0 {
				sessID := actor.SessionID
				exceptSess = &sessID
			}
			s.events.Record(ctx, events.NewSessionRevoked(
				acc.CompanyID,
				string(actor.ActorType),
				actor.ActorID,
				nil,
				exceptSess,
				"password_changed",
			))
		}

		return nil
	})
}
