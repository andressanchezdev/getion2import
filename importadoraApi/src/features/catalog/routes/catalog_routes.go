package routes

// catalog_routes.go · rutas HTTP de catálogo (marcas, categorías y modelos) y los roles o permisos que exige cada una
// conecta con: los controllers de catálogo (marcas, categorías y modelos) y core/middlewares (autenticación y permisos); los arma core/bootstrap

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/catalog/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes registra los endpoints del catálogo base (marcas, modelos y categorías)
func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.CatalogController) {
	// Grupo /brands
	b := e.Group("/brands", authMiddleware.Authenticate())
	{
		b.GET("", ctrl.ListBrands)
		b.GET("/:id", ctrl.GetBrandByID)
		b.POST("", ctrl.CreateBrand, authMiddleware.RequirePermission("brands", "create"))
		b.PUT("/:id", ctrl.UpdateBrand, authMiddleware.RequirePermission("brands", "edit"))
		b.DELETE("/:id", ctrl.DeleteBrand, authMiddleware.RequirePermission("brands", "delete"))
	}

	// Grupo /models
	m := e.Group("/models", authMiddleware.Authenticate())
	{
		m.GET("", ctrl.ListModels)
		m.GET("/:id", ctrl.GetModelByID)
		m.POST("", ctrl.CreateModel, authMiddleware.RequirePermission("models", "create"))
		m.PUT("/:id", ctrl.UpdateModel, authMiddleware.RequirePermission("models", "edit"))
		m.DELETE("/:id", ctrl.DeleteModel, authMiddleware.RequirePermission("models", "delete"))
	}

	// Grupo /categories
	c := e.Group("/categories", authMiddleware.Authenticate())
	{
		c.GET("", ctrl.ListCategories)
		c.GET("/:id", ctrl.GetCategoryByID)
		c.POST("", ctrl.CreateCategory, authMiddleware.RequirePermission("categories", "create"))
		c.PUT("/:id", ctrl.UpdateCategory, authMiddleware.RequirePermission("categories", "edit"))
		c.DELETE("/:id", ctrl.DeleteCategory, authMiddleware.RequirePermission("categories", "delete"))
	}
}
