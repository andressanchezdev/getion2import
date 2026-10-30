package routes

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/sales/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes registra los endpoints de ventas, órdenes y facturas
func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.SaleController) {
	salesGroup := e.Group("/sales", authMiddleware.Authenticate())
	{
		salesGroup.POST("", ctrl.Create)
		salesGroup.GET("", ctrl.List)
		salesGroup.GET("/:id", ctrl.FindByID)
		salesGroup.POST("/:id/verify", ctrl.AdvanceToVerification)
		salesGroup.POST("/:id/pick", ctrl.AdvanceToPicking)
		salesGroup.POST("/:id/pack", ctrl.AdvanceToPacking)
		salesGroup.POST("/:id/invoice", ctrl.IssueInvoice)
		salesGroup.POST("/:id/dispatch", ctrl.AdvanceToDispatch)
		salesGroup.POST("/:id/send", ctrl.AdvanceToSend)
		salesGroup.POST("/:id/cancel", ctrl.CancelSale)
	}

	invoicesGroup := e.Group("/invoices", authMiddleware.Authenticate())
	{
		invoicesGroup.GET("", ctrl.ListInvoices)
		invoicesGroup.GET("/:id", ctrl.FindInvoiceByID)
	}
}
