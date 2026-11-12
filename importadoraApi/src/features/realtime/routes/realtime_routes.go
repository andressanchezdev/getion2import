package routes

// realtime_routes.go · rutas HTTP del tiempo real: POST /realtime/ticket (solo emite tickets; el websocket lo atiende importadoraRealtime)
// conecta con: realtime_controller y core/middlewares; las arma core/bootstrap
// ojo: sin RequirePermission a propósito: todo actor autenticado puede conectarse; lo que recibe se filtra por evento con sus permisos

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/realtime/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes registra las rutas del tiempo real.
func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.RealtimeController) {
	g := e.Group("/realtime", authMiddleware.Authenticate())
	{
		g.POST("/ticket", ctrl.IssueTicket)
	}
}
