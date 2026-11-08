package middlewares

// superadmin_readonly · bloquea mutaciones del Superadmin en módulos operativos que no usan RequirePermission (p. ej. carritos)
// conecta con: las rutas de carritos (la usan como middleware del grupo) y core/utils (errores)

import (
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"

	"github.com/labstack/echo/v4"
)

// DenySuperadminWrites deja pasar las lecturas y rechaza POST/PUT/PATCH/DELETE hechos por un Superadmin.
func DenySuperadminWrites() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			actor := GetActor(c)
			if actor != nil && actor.ActorType == types.ActorSuperadmin {
				switch c.Request().Method {
				case "GET", "HEAD", "OPTIONS":
				default:
					return utils.Forbidden("SUPERADMIN_READ_ONLY", "El Superadministrador opera en modo solo lectura para módulos operativos.")
				}
			}
			return next(c)
		}
	}
}
