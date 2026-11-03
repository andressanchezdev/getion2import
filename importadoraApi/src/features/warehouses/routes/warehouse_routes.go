package routes

// warehouse_routes.go · rutas HTTP de bodegas y los roles o permisos que exige cada una
// conecta con: los controllers de bodegas y core/middlewares (autenticación y permisos); los arma core/bootstrap

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
		wh.POST("", ctrl.Create, authMiddleware.RequirePermission("warehouses", "create"))
		wh.GET("", ctrl.Get)
		wh.GET("/search", ctrl.Search)
		wh.GET("/:id", ctrl.GetByID)
		wh.PUT("/:id", ctrl.Update, authMiddleware.RequirePermission("warehouses", "edit"))
		wh.DELETE("/:id", ctrl.Deactivate, authMiddleware.RequirePermission("warehouses", "delete"))

		// Sub-rutas de facturación fiscal por bodega
		wh.GET("/:id/facturation", ctrl.GetFacturation)
		wh.PUT("/:id/facturation", ctrl.UpdateFacturation, authMiddleware.RequirePermission("warehouses", "edit"))

		// Sub-rutas de ubicaciones físicas de bodega
		wh.GET("/:id/locations", ctrl.ListLocations)
		wh.POST("/:id/locations", ctrl.CreateLocation, authMiddleware.RequirePermission("stock", "edit"))
		wh.PUT("/:id/locations/:locId", ctrl.UpdateLocation, authMiddleware.RequirePermission("stock", "edit"))
		wh.DELETE("/:id/locations/:locId", ctrl.DeleteLocation, authMiddleware.RequirePermission("stock", "edit"))
	}

	// Grupo /doc-series
	ds := e.Group("/doc-series", authMiddleware.Authenticate())
	{
		ds.GET("", ctrl.ListDocSeries)
		ds.PUT("/:id", ctrl.UpdateDocSeries, authMiddleware.RequirePermission("warehouses", "edit"))
	}
}
