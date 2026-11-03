package routes

// cash_session_routes.go · rutas de /cash/sessions con su permiso por acción (RequirePermission)
// conecta con: cash_session_controller y el arranque en core/bootstrap

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/cash_sessions/controllers"

	"github.com/labstack/echo/v4"
)

func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.CashSessionController) {
	g := e.Group("/cash/sessions", authMiddleware.Authenticate())
	{
		g.GET("/active", ctrl.GetActive, authMiddleware.RequirePermission("cash", "view"))
		g.POST("/open", ctrl.Open, authMiddleware.RequirePermission("cash", "create"))
		g.POST("/close", ctrl.Close, authMiddleware.RequirePermission("cash", "edit"))
	}
}
