package routes

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/wallet/controllers"

	"github.com/labstack/echo/v4"
)

func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.WalletController) {
	g := e.Group("/wallet", authMiddleware.Authenticate())
	{
		g.GET("/summary/:customerId", ctrl.GetCustomerSummary)
		g.GET("/entries", ctrl.ListEntries)
		g.POST("/adjust", ctrl.CreateAdjustment)
	}
}

