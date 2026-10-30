package routes

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
		c.GET("/:id", ctrl.GetByID)
		c.GET("/:id/credit-status", ctrl.GetCreditStatus)
		c.POST("", ctrl.Create)
		c.PUT("/:id", ctrl.Update)
		c.DELETE("/:id", ctrl.Delete)

		// Sub-recursos de documentos adjuntos
		c.GET("/:id/documents", ctrl.ListDocuments)
		c.POST("/:id/documents", ctrl.UploadDocument)
		c.DELETE("/:id/documents/:docId", ctrl.DeleteDocument)
	}
}

