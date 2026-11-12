package middlewares

// auth_middleware.go · autenticación y autorización: valida el token y exige tipo de actor o permiso por ruta
// conecta con: core/utils (JWT y errores), repositories de autenticación y los routes de cada módulo

import (
	"context"
	"log/slog"
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
	IsActorAvailable(ctx context.Context, db db.DBExecutor, actorType types.ActorType, actorID int64) (bool, error)
	LoadPermissionsForActor(ctx context.Context, db db.DBExecutor, actorType types.ActorType, actorID int64) ([]PermissionRecord, error)
}

type AuthMiddleware struct {
	cfg       *config.Config
	db        db.DBExecutor
	validator SessionValidator
}

// NewAuthMiddleware crea el middleware de autenticación con lo que necesita para validar tokens y permisos.
func NewAuthMiddleware(cfg *config.Config, db db.DBExecutor, validator SessionValidator) *AuthMiddleware {
	return &AuthMiddleware{
		cfg:       cfg,
		db:        db,
		validator: validator,
	}
}

// Authenticate valida el token de la petición y deja al actor (quién es y de qué compañía) en el contexto.
func (m *AuthMiddleware) Authenticate() echo.MiddlewareFunc {
	return Authenticate(m.cfg.JWTSecret, m.validator, m.db)
}

// RequireActors deja pasar solo a los tipos de actor indicados (superadmin, administrador o empleado).
func (m *AuthMiddleware) RequireActors(allowed ...types.ActorType) echo.MiddlewareFunc {
	return RequireActors(allowed...)
}

// RequirePermission deja pasar solo a quien tiene el permiso del módulo y la acción indicados.
func (m *AuthMiddleware) RequirePermission(module, action string) echo.MiddlewareFunc {
	return RequirePermission(module, action)
}

// RequireAnyPermission deja pasar a quien tenga al menos una de las llaves 'modulo:accion'.
func (m *AuthMiddleware) RequireAnyPermission(keys ...string) echo.MiddlewareFunc {
	return RequireAnyPermission(keys...)
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
			if validator != nil {
				available, err := validator.IsActorAvailable(c.Request().Context(), db, claims.ActorType, claims.ActorID)
				if err != nil {
					return utils.Internal("No se pudo validar el estado de la cuenta.", err)
				}
				if !available {
					return utils.Unauthorized("ACCOUNT_UNAVAILABLE", "La compañía o bodega asociada no está disponible. Comunícate con el área de desarrollo.")
				}
			}

			// Cargar permisos habilitados si el actor es un empleado
			permMap := make(map[string]bool)
			if validator != nil {
				perms, err := validator.LoadPermissionsForActor(c.Request().Context(), db, claims.ActorType, claims.ActorID)
				if err != nil {
					// ojo: falla cerrada a propósito; sin permisos cargados el empleado queda sin acceso (el admin no los necesita)
					slog.Warn("no se pudieron cargar los permisos del actor; se niega por defecto", "actorType", claims.ActorType, "actorID", claims.ActorID, "error", err)
				}
				for _, p := range perms {
					permMap[p.Module+":"+p.Action] = true
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
			// el actor también va en el context.Context de la petición: lo leen los servicios que guardan eventos del websocket
			c.SetRequest(c.Request().WithContext(WithActor(c.Request().Context(), actorCtx)))
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

// governanceModules son los módulos que el superadministrador sí puede mutar; en los demás solo lee.
var governanceModules = map[string]bool{"companies": true, "admins": true, "superadmin": true, "screensaver": true, "recyclebin": true, "audit": true}

// actorAllows decide si el actor cumple el permiso 'modulo:accion'; RequirePermission y RequireAnyPermission la comparten.
// Admins (dentro de su compañía) tienen acceso completo por diseño.
// Superadmins leen todo (view, view_detail) y solo mutan módulos de gobernanza.
// Empleados necesitan la llave exacta en employee_permissions.
func actorAllows(actor *ActorContext, module, action string) bool {
	switch actor.ActorType {
	case types.ActorAdmin:
		return true
	case types.ActorSuperadmin:
		return action == "view" || action == "view_detail" || governanceModules[module]
	default:
		return actor.Permissions[module+":"+action]
	}
}

// RequirePermission verifica dinámicamente si el actor tiene el permiso 'modulo:accion'.
func RequirePermission(module, action string) echo.MiddlewareFunc {
	requiredKey := module + ":" + action
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			actor := GetActor(c)
			if actor == nil {
				return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
			}
			if actorAllows(actor, module, action) {
				return next(c)
			}
			if actor.ActorType == types.ActorSuperadmin {
				return utils.Forbidden("SUPERADMIN_READ_ONLY", "El Superadministrador opera en modo solo lectura para módulos operativos.")
			}
			return utils.Forbidden("INSUFFICIENT_PERMISSIONS", "No tienes el permiso requerido: "+requiredKey)
		}
	}
}

// RequireAnyPermission deja pasar si el actor cumple al menos uno de los permisos 'modulo:accion'.
// Sirve para lecturas que usan varios flujos: por ejemplo el selector de clientes lo pide el checkout (orders:create) y la cartera (credits:view).
// ojo: una llave mal escrita (sin «:») hace fallar el arranque; routes_guard_test también revisa que exista en el catálogo
func RequireAnyPermission(keys ...string) echo.MiddlewareFunc {
	type pair struct{ module, action string }
	pairs := make([]pair, 0, len(keys))
	for _, k := range keys {
		module, action, ok := strings.Cut(k, ":")
		if !ok || module == "" || action == "" {
			panic("RequireAnyPermission: llave inválida " + k)
		}
		pairs = append(pairs, pair{module, action})
	}
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			actor := GetActor(c)
			if actor == nil {
				return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
			}
			for _, p := range pairs {
				if actorAllows(actor, p.module, p.action) {
					return next(c)
				}
			}
			return utils.Forbidden("INSUFFICIENT_PERMISSIONS", "No tienes ninguno de los permisos requeridos: "+strings.Join(keys, ", "))
		}
	}
}

// ActorCan dice si el actor cumple alguna de las llaves 'modulo:accion' con las mismas reglas de las rutas.
// Lo usan los servicios cuando el permiso depende del contenido de la petición (por ejemplo, cambiar precios dentro de PUT /products/:id).
func ActorCan(actor *ActorContext, keys ...string) bool {
	if actor == nil {
		return false
	}
	for _, k := range keys {
		if module, action, ok := strings.Cut(k, ":"); ok && actorAllows(actor, module, action) {
			return true
		}
	}
	return false
}
