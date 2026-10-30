package routes

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/reports/controllers"

	"github.com/labstack/echo/v4"
)

func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.ReportController) {
	g := e.Group("/reports", authMiddleware.Authenticate())
	{
		g.GET("/sales", ctrl.GetSalesReport)
		g.GET("/inventory", ctrl.GetInventoryReport)
		g.GET("/wallet", ctrl.GetWalletReport)
	}
}

