package routes

// payment_routes.go · rutas HTTP de pagos y los roles o permisos que exige cada una
// conecta con: los controllers de pagos y core/middlewares (autenticación y permisos); los arma core/bootstrap

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/payments/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes registra las rutas del módulo y los roles o permisos que exige cada una.
func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.PaymentController) {
	g := e.Group("/payments", authMiddleware.Authenticate())
	{
		g.POST("", ctrl.Create, authMiddleware.RequirePermission("payments", "create"))
		g.POST("/batch", ctrl.CreateBatch, authMiddleware.RequirePermission("payments", "create"))
		g.GET("", ctrl.List, authMiddleware.RequirePermission("payments", "view"))
		g.GET("/:id", ctrl.FindByID, authMiddleware.RequirePermission("payments", "view"))
		g.POST("/:id/verify", ctrl.Verify, authMiddleware.RequirePermission("payments", "edit"))
		g.POST("/:id/void", ctrl.Void, authMiddleware.RequirePermission("payments", "edit"))
	}
}
