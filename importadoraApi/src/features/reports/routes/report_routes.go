package routes

// report_routes.go · rutas HTTP de reportes y los roles o permisos que exige cada una
// conecta con: los controllers de reportes y core/middlewares (autenticación y permisos); los arma core/bootstrap

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/reports/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes registra las rutas del módulo y los roles o permisos que exige cada una.
func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.ReportController) {
	g := e.Group("/reports", authMiddleware.Authenticate())
	{
		g.GET("/general", ctrl.GetGeneralReport, authMiddleware.RequirePermission("reports", "view"))
		g.GET("/sales", ctrl.GetSalesReport, authMiddleware.RequirePermission("reports", "view"))
		g.GET("/inventory", ctrl.GetInventoryReport, authMiddleware.RequirePermission("reports", "view"))
		g.GET("/wallet", ctrl.GetWalletReport, authMiddleware.RequirePermission("reports", "view"))
	}
}
