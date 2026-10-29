package routes

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/externals/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes registra los endpoints del módulo de entidades externas (proveedores, transportadoras, etc.)
func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.ExternalController) {
	ext := e.Group("/externals", authMiddleware.Authenticate())
	{
		ext.GET("", ctrl.Get)
		ext.GET("/search", ctrl.Search)
		ext.GET("/:id", ctrl.GetByID)
		ext.POST("", ctrl.Create)
		ext.PUT("/:id", ctrl.Update)
		ext.DELETE("/:id", ctrl.Delete)
	}
}

