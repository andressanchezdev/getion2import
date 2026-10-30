package routes

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/payments/controllers"

	"github.com/labstack/echo/v4"
)

func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.PaymentController) {
	g := e.Group("/payments", authMiddleware.Authenticate())
	{
		g.POST("", ctrl.Create)
		g.GET("", ctrl.List)
		g.GET("/:id", ctrl.FindByID)
		g.POST("/:id/verify", ctrl.Verify)
		g.POST("/:id/void", ctrl.Void)
	}
}

