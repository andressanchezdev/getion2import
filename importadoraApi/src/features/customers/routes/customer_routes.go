package routes

// customer_routes.go · rutas HTTP de clientes y los roles o permisos que exige cada una
// conecta con: los controllers de clientes y core/middlewares (autenticación y permisos); los arma core/bootstrap

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/customers/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes registra los endpoints del módulo de clientes y sus documentos adjuntos
func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.CustomerController) {
	c := e.Group("/customers", authMiddleware.Authenticate())
	{
		c.GET("", ctrl.Get)
		c.GET("/selector", ctrl.ListSelector)
		c.GET("/search", ctrl.Search)
		c.GET("/documents/alerts", ctrl.DocumentAlerts)
		c.GET("/:id", ctrl.GetByID)
		c.GET("/:id/credit-status", ctrl.GetCreditStatus)
		c.POST("", ctrl.Create, authMiddleware.RequirePermission("customers", "create"))
		c.PUT("/:id", ctrl.Update, authMiddleware.RequirePermission("customers", "edit"))
		c.DELETE("/:id", ctrl.Delete, authMiddleware.RequirePermission("customers", "delete"))

		// Sub-recursos de documentos adjuntos
		c.GET("/:id/documents", ctrl.ListDocuments)
		c.POST("/:id/documents", ctrl.UploadDocument, authMiddleware.RequirePermission("customers", "edit"))
		c.POST("/:id/documents/:docId/renew", ctrl.RenewDocument, authMiddleware.RequirePermission("customers", "edit"))
		c.DELETE("/:id/documents/:docId", ctrl.DeleteDocument, authMiddleware.RequirePermission("customers", "delete"))
	}
}
