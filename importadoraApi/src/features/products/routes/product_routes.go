package routes

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/products/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes registra los endpoints del módulo de productos, códigos y proveedores asociados
func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.ProductController) {
	p := e.Group("/products", authMiddleware.Authenticate())
	{
		p.GET("", ctrl.Get)
		p.GET("/search", ctrl.Search)
		p.GET("/:id", ctrl.GetByID)
		p.POST("", ctrl.Create)
		p.PUT("/:id", ctrl.Update)
		p.DELETE("/:id", ctrl.Delete)

		// Sub-recursos de códigos alternos
		p.GET("/:id/codes", ctrl.ListCodes)
		p.POST("/:id/codes", ctrl.CreateCode)
		p.DELETE("/:id/codes/:codeId", ctrl.DeleteCode)

		// Sub-recursos de proveedores asignados al producto
		p.GET("/:id/suppliers", ctrl.ListSuppliers)
		p.POST("/:id/suppliers", ctrl.AssignSupplier)
		p.DELETE("/:id/suppliers/:supplierId", ctrl.RemoveSupplier)
	}
}

