package routes

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/audit/controllers"

	"github.com/labstack/echo/v4"
)

func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.AuditController) {
	g := e.Group("/audit-logs", authMiddleware.Authenticate())
	{
		g.GET("", ctrl.List)
	}
}

