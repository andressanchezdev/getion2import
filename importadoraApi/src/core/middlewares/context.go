package middlewares

import (
	"strconv"
	"strings"

	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"

	"github.com/labstack/echo/v4"
)

const ActorContextKey = "actor_context"

// ActorContext contiene los datos extraídos del JWT firmados para el request actual.
type ActorContext struct {
	ActorType   types.ActorType
	ActorID     int64
	CompanyID   *int64
	WarehouseID *int64
	RoleID      *int64
	SessionID   int64
	Email       string
	Permissions map[string]bool // "module:action" -> true
}

// GetActor obtiene el ActorContext inyectado por el middleware de autenticación.
func GetActor(c echo.Context) *ActorContext {
	val := c.Get(ActorContextKey)
	if actor, ok := val.(*ActorContext); ok {
		return actor
	}
	return nil
}

// EffectiveCompanyID extrae el company_id asegurando aislamiento multi-tenant:
// - Para admin y employee: OBLIGATORIAMENTE el CompanyID firmado en su JWT.
// - Para superadmin: puede inspeccionar una compañía mediante header 'X-Company-Id' o query param 'companyId'.
func EffectiveCompanyID(c echo.Context) (int64, error) {
	actor := GetActor(c)
	if actor == nil {
		return 0, utils.Unauthorized("UNAUTHORIZED", "Actor no autenticado.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID <= 0 {
			return 0, utils.Forbidden("FORBIDDEN_NO_COMPANY", "El usuario no pertenece a ninguna compañía activa.")
		}
		return *actor.CompanyID, nil
	}

	// Superadmin: evaluar header opcional
	headerVal := strings.TrimSpace(c.Request().Header.Get("X-Company-Id"))
	if headerVal != "" {
		id, err := strconv.ParseInt(headerVal, 10, 64)
		if err == nil && id > 0 {
			return id, nil
		}
	}

	// Superadmin: evaluar query param opcional
	queryVal := strings.TrimSpace(c.QueryParam("companyId"))
	if queryVal != "" {
		id, err := strconv.ParseInt(queryVal, 10, 64)
		if err == nil && id > 0 {
			return id, nil
		}
	}

	return 0, nil
}

// EffectiveCompanyIDFromContext extrae el company_id directamente del ActorContext.
func EffectiveCompanyIDFromContext(actor *ActorContext) (int64, error) {
	if actor == nil {
		return 0, utils.Unauthorized("UNAUTHORIZED", "Actor no autenticado.")
	}
	if actor.CompanyID != nil && *actor.CompanyID > 0 {
		return *actor.CompanyID, nil
	}
	if actor.ActorType == types.ActorSuperadmin {
		return 0, nil
	}
	return 0, utils.Forbidden("FORBIDDEN_NO_COMPANY", "El usuario no pertenece a ninguna compañía activa.")
}

