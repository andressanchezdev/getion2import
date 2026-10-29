package routes

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/warehouses/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes registra los endpoints del módulo de bodegas, facturación y series numéricas
func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.WarehouseController) {
	// Grupo /warehouses
	wh := e.Group("/warehouses", authMiddleware.Authenticate())
	{
		wh.POST("", ctrl.Create)
		wh.GET("", ctrl.Get)
		wh.GET("/search", ctrl.Search)
		wh.GET("/:id", ctrl.GetByID)
		wh.PUT("/:id", ctrl.Update)
		wh.DELETE("/:id", ctrl.Deactivate)

		// Sub-rutas de facturación fiscal por bodega
		wh.GET("/:id/facturation", ctrl.GetFacturation)
		wh.PUT("/:id/facturation", ctrl.UpdateFacturation)
	}

	// Grupo /doc-series
	ds := e.Group("/doc-series", authMiddleware.Authenticate())
	{
		ds.GET("", ctrl.ListDocSeries)
		ds.PUT("/:id", ctrl.UpdateDocSeries)
	}
}

