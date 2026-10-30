package routes

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/purchases/controllers"

	"github.com/labstack/echo/v4"
)

func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.PurchaseController) {
	g := e.Group("/purchases", authMiddleware.Authenticate())
	{
		g.POST("", ctrl.Create)
		g.GET("", ctrl.List)
		g.GET("/:id", ctrl.FindByID)
		g.GET("/:id/export/excel", ctrl.ExportExcel)
		g.POST("/:id/receive", ctrl.Receive)
		g.POST("/:id/void", ctrl.Void)

		// Catálogo de productos por proveedor
		g.POST("/suppliers/:supplierId/catalog/upload", ctrl.UploadSupplierCatalog)
		g.GET("/suppliers/:supplierId/products", ctrl.ListSupplierProducts)
	}
}

