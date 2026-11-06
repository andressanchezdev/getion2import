package routes

// audit_routes.go · rutas HTTP de auditoría y los roles o permisos que exige cada una
// conecta con: los controllers de auditoría y core/middlewares (autenticación y permisos); los arma core/bootstrap

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/features/audit/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes registra las rutas del módulo y los roles o permisos que exige cada una.
func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.AuditController) {
	g := e.Group("/audit-logs", authMiddleware.Authenticate())
	{
		g.GET("", ctrl.List, authMiddleware.RequirePermission("audit", "view"))
		g.POST("/context-change", ctrl.LogContextChange, middlewares.RequireActors(types.ActorSuperadmin))
	}
}
