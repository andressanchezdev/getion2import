package routes

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
		b.POST("", ctrl.CreateBrand)
		b.PUT("/:id", ctrl.UpdateBrand)
		b.DELETE("/:id", ctrl.DeleteBrand)
	}

	// Grupo /models
	m := e.Group("/models", authMiddleware.Authenticate())
	{
		m.GET("", ctrl.ListModels)
		m.GET("/:id", ctrl.GetModelByID)
		m.POST("", ctrl.CreateModel)
		m.PUT("/:id", ctrl.UpdateModel)
		m.DELETE("/:id", ctrl.DeleteModel)
	}

	// Grupo /categories
	c := e.Group("/categories", authMiddleware.Authenticate())
	{
		c.GET("", ctrl.ListCategories)
		c.GET("/:id", ctrl.GetCategoryByID)
		c.POST("", ctrl.CreateCategory)
		c.PUT("/:id", ctrl.UpdateCategory)
		c.DELETE("/:id", ctrl.DeleteCategory)
	}
}

