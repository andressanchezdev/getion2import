package routes

// purchase_routes.go · rutas HTTP de compras y los roles o permisos que exige cada una
// conecta con: los controllers de compras y core/middlewares (autenticación y permisos); los arma core/bootstrap

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/purchases/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes registra las rutas del módulo y los roles o permisos que exige cada una.
func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.PurchaseController) {
	g := e.Group("/purchases", authMiddleware.Authenticate())
	{
		g.POST("", ctrl.Create, authMiddleware.RequirePermission("purchases", "create"))
		g.GET("", ctrl.List, authMiddleware.RequirePermission("purchases", "view"))
		g.GET("/:id", ctrl.FindByID, authMiddleware.RequirePermission("purchases", "view_detail"))
		g.GET("/:id/export/excel", ctrl.ExportExcel, authMiddleware.RequirePermission("purchases", "view"))
		g.POST("/:id/receive", ctrl.Receive, authMiddleware.RequirePermission("purchases", "receive"))
		g.POST("/:id/void", ctrl.Void, authMiddleware.RequirePermission("purchases", "edit"))
		g.POST("/:id/pay", ctrl.Pay, authMiddleware.RequirePermission("cash", "edit"))

		// Catálogo de productos por proveedor
		g.POST("/suppliers/:supplierId/catalog/upload", ctrl.UploadSupplierCatalog, authMiddleware.RequirePermission("purchases", "create"))
		g.GET("/suppliers/:supplierId/products", ctrl.ListSupplierProducts, authMiddleware.RequirePermission("purchases", "view"))
		g.PUT("/suppliers/:supplierId/products", ctrl.SaveSupplierProduct, authMiddleware.RequirePermission("purchases", "create"))
		g.DELETE("/suppliers/:supplierId/products/:productId", ctrl.DeleteSupplierProduct, authMiddleware.RequirePermission("purchases", "create"))
	}
}
