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
		g.POST("/open", ctrl.Open, authMiddleware.RequirePermission("cash", "open_close"))
		g.POST("/close", ctrl.Close, authMiddleware.RequirePermission("cash", "open_close"))
	}

	// los gastos de todas las cajas cerradas (Facturas): solo quien tiene el permiso de Facturas
	e.GET("/cash/expenses", ctrl.ListExpenses, authMiddleware.Authenticate(), authMiddleware.RequirePermission("invoices", "view"))
}
