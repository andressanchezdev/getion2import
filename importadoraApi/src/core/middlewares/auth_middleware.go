package middlewares

import (
	"context"
	"strings"

	"importadoraApi/src/core/config"
	"importadoraApi/src/core/db"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"

	"github.com/labstack/echo/v4"
)

// PermissionRecord representa un permiso consultado para el actor
type PermissionRecord struct {
	ID          int64
	Module      string
	Action      string
	Description string
}

// SessionValidator desacopla el middleware del repositorio de autenticación
type SessionValidator interface {
	IsSessionActive(ctx context.Context, db db.DBExecutor, sessionID int64) (bool, error)
	LoadPermissionsForActor(ctx context.Context, db db.DBExecutor, actorType types.ActorType, actorID int64) ([]PermissionRecord, error)
}

type AuthMiddleware struct {
	cfg       *config.Config
	db        db.DBExecutor
	validator SessionValidator
}

func NewAuthMiddleware(cfg *config.Config, db db.DBExecutor, validator SessionValidator) *AuthMiddleware {
	return &AuthMiddleware{
		cfg:       cfg,
		db:        db,
		validator: validator,
	}
}

func (m *AuthMiddleware) Authenticate() echo.MiddlewareFunc {
	return Authenticate(m.cfg.JWTSecret, m.validator, m.db)
}

func (m *AuthMiddleware) RequireActors(allowed ...types.ActorType) echo.MiddlewareFunc {
	return RequireActors(allowed...)
}

func (m *AuthMiddleware) RequirePermission(module, action string) echo.MiddlewareFunc {
	return RequirePermission(module, action)
}

// Authenticate verifica la cabecera 'Authorization: Bearer <token>', la firma JWT,
// y confirma que la sesión en 'refresh_tokens' no haya sido revocada.
func Authenticate(jwtSecret string, validator SessionValidator, db db.DBExecutor) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				return utils.Unauthorized("MISSING_TOKEN", "Se requiere token de autenticación Bearer.")
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				return utils.Unauthorized("INVALID_AUTH_HEADER", "Formato de autorización inválido. Debe ser: Bearer <token>")
			}

			claims, err := utils.ParseAccessToken(jwtSecret, strings.TrimSpace(parts[1]))
			if err != nil {
				return err
			}

			// Validar si la sesión sigue activa en la base de datos (invalida el token al hacer logout)
			if claims.SessionID > 0 && validator != nil {
				isActive, err := validator.IsSessionActive(c.Request().Context(), db, claims.SessionID)
				if err != nil || !isActive {
					return utils.Unauthorized("SESSION_REVOKED", "La sesión ha expirado o fue cerrada.")
				}
			}

			// Cargar permisos habilitados si el actor es un empleado
			permMap := make(map[string]bool)
			if validator != nil {
				perms, err := validator.LoadPermissionsForActor(c.Request().Context(), db, claims.ActorType, claims.ActorID)
				if err == nil {
					for _, p := range perms {
						permMap[p.Module+":"+p.Action] = true
					}
				}
			}

			actorCtx := &ActorContext{
				ActorType:   claims.ActorType,
				ActorID:     claims.ActorID,
				CompanyID:   claims.CompanyID,
				WarehouseID: claims.WarehouseID,
				RoleID:      claims.RoleID,
				SessionID:   claims.SessionID,
				Email:       claims.Email,
				Permissions: permMap,
			}

			c.Set(ActorContextKey, actorCtx)
			return next(c)
		}
	}
}

// RequireActors restringe el acceso solo a los niveles de actor especificados.
func RequireActors(allowed ...types.ActorType) echo.MiddlewareFunc {
	allowedMap := make(map[types.ActorType]bool, len(allowed))
	for _, a := range allowed {
		allowedMap[a] = true
	}

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			actor := GetActor(c)
			if actor == nil {
				return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
			}
			if !allowedMap[actor.ActorType] {
				return utils.Forbidden("FORBIDDEN_ROLE", "No tienes el rol de actor requerido para esta operación.")
			}
			return next(c)
		}
	}
}

// RequirePermission verifica dinámicamente si el actor tiene el permiso 'modulo:accion'.
// Superadmins y Admins (dentro de su compañía) tienen acceso completo por diseño.
func RequirePermission(module, action string) echo.MiddlewareFunc {
	requiredKey := module + ":" + action
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			actor := GetActor(c)
			if actor == nil {
				return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
			}

			// Superadmin y Admin tienen acceso a todas las acciones de su alcance
			if actor.ActorType == types.ActorSuperadmin || actor.ActorType == types.ActorAdmin {
				return next(c)
			}

			// Para empleados se valida en la tabla employee_permissions
			if !actor.Permissions[requiredKey] {
				return utils.Forbidden("INSUFFICIENT_PERMISSIONS", "No tienes el permiso requerido: "+requiredKey)
			}

			return next(c)
		}
	}
}

