package routes

// wallet_routes.go · rutas HTTP de cartera y los roles o permisos que exige cada una
// conecta con: los controllers de cartera y core/middlewares (autenticación y permisos); los arma core/bootstrap

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/wallet/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes registra las rutas del módulo y los roles o permisos que exige cada una.
func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.WalletController) {
	g := e.Group("/wallet", authMiddleware.Authenticate())
	{
		g.GET("/summary/:customerId", ctrl.GetCustomerSummary, authMiddleware.RequirePermission("credits", "view"))
		g.GET("/entries", ctrl.ListEntries, authMiddleware.RequirePermission("credits", "view"))
		g.POST("/adjust", ctrl.CreateAdjustment, authMiddleware.RequirePermission("credits", "edit"))
	}
}
