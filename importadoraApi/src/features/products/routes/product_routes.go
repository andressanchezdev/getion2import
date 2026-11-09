package routes

// product_routes.go · rutas HTTP de productos y los roles o permisos que exige cada una
// conecta con: los controllers de productos y core/middlewares (autenticación y permisos); los arma core/bootstrap

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
		p.GET("/thumbnails", ctrl.Thumbnails)
		p.GET("/:id", ctrl.GetByID)
		p.POST("", ctrl.Create, authMiddleware.RequirePermission("products", "create"))
		p.PUT("/:id", ctrl.Update, authMiddleware.RequirePermission("products", "edit"))
		p.DELETE("/:id", ctrl.Delete, authMiddleware.RequirePermission("products", "delete"))

		// Sub-recursos de códigos alternos
		p.GET("/:id/codes", ctrl.ListCodes)
		p.POST("/:id/codes", ctrl.CreateCode, authMiddleware.RequirePermission("products", "edit"))
		p.DELETE("/:id/codes/:codeId", ctrl.DeleteCode, authMiddleware.RequirePermission("products", "edit"))

		// Sub-recursos de proveedores asignados al producto
		p.GET("/:id/suppliers", ctrl.ListSuppliers)
		p.POST("/:id/suppliers", ctrl.AssignSupplier, authMiddleware.RequirePermission("products", "edit"))
		p.DELETE("/:id/suppliers/:supplierId", ctrl.RemoveSupplier, authMiddleware.RequirePermission("products", "edit"))
	}
}
