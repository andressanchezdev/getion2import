package routes

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/returns/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes registra los endpoints del módulo de devoluciones
func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.ReturnController) {
	returnsGroup := e.Group("/returns", authMiddleware.Authenticate())
	{
		returnsGroup.POST("", ctrl.Create)
		returnsGroup.GET("", ctrl.List)
		returnsGroup.GET("/:id", ctrl.FindByID)
		returnsGroup.POST("/:id/approve", ctrl.Approve)
		returnsGroup.POST("/:id/reject", ctrl.Reject)
	}
}
