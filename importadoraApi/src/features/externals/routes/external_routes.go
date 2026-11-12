package routes

// external_routes.go · rutas HTTP de terceros (proveedores y transportadoras) y los roles o permisos que exige cada una
// conecta con: los controllers de terceros (proveedores y transportadoras) y core/middlewares (autenticación y permisos); los arma core/bootstrap

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/externals/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes registra los endpoints del módulo de entidades externas (proveedores, transportadoras, etc.)
func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.ExternalController) {
	ext := e.Group("/externals", authMiddleware.Authenticate())
	{
		ext.GET("", ctrl.Get, authMiddleware.RequireAnyPermission("suppliers:view", "purchases:view", "purchases:create", "orders:advance_stage", "transfers:create", "transfers:edit"))
		ext.GET("/search", ctrl.Search, authMiddleware.RequireAnyPermission("suppliers:view", "purchases:view", "purchases:create", "orders:advance_stage", "transfers:create", "transfers:edit"))
		ext.GET("/:id", ctrl.GetByID, authMiddleware.RequireAnyPermission("suppliers:view_detail", "purchases:view"))
		ext.POST("", ctrl.Create, authMiddleware.RequirePermission("suppliers", "create"))
		ext.PUT("/:id", ctrl.Update, authMiddleware.RequirePermission("suppliers", "edit"))
		ext.DELETE("/:id", ctrl.Delete, authMiddleware.RequirePermission("suppliers", "delete"))
	}
}
