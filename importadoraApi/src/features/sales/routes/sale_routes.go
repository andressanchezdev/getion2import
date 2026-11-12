package routes

// sale_routes.go · rutas HTTP de ventas y los roles o permisos que exige cada una
// conecta con: los controllers de ventas y core/middlewares (autenticación y permisos); los arma core/bootstrap

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/sales/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes registra los endpoints de ventas, órdenes y facturas
func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.SaleController) {
	salesGroup := e.Group("/sales", authMiddleware.Authenticate())
	{
		salesGroup.POST("", ctrl.Create, authMiddleware.RequirePermission("orders", "create"))
		salesGroup.GET("", ctrl.List, authMiddleware.RequirePermission("orders", "view"))
		salesGroup.GET("/:id", ctrl.FindByID, authMiddleware.RequirePermission("orders", "view_detail"))
		salesGroup.GET("/:id/history", ctrl.StageHistory, authMiddleware.RequirePermission("orders", "view_detail"))
		salesGroup.POST("/:id/verify", ctrl.AdvanceToVerification, authMiddleware.RequirePermission("orders", "verify_payment"))
		salesGroup.POST("/:id/verify-payment", ctrl.AdvanceToVerification, authMiddleware.RequirePermission("orders", "verify_payment"))
		salesGroup.POST("/:id/pick", ctrl.AdvanceToPicking, authMiddleware.RequirePermission("orders", "advance_stage"))
		salesGroup.POST("/:id/pack", ctrl.AdvanceToPacking, authMiddleware.RequirePermission("orders", "advance_stage"))
		salesGroup.POST("/:id/invoice", ctrl.IssueInvoice, authMiddleware.RequirePermission("orders", "invoice"))
		salesGroup.POST("/:id/dispatch", ctrl.AdvanceToDispatch, authMiddleware.RequirePermission("orders", "advance_stage"))
		salesGroup.POST("/:id/send", ctrl.AdvanceToSend, authMiddleware.RequirePermission("orders", "advance_stage"))
		salesGroup.POST("/:id/cancel", ctrl.CancelSale, authMiddleware.RequirePermission("orders", "delete"))
	}

	invoicesGroup := e.Group("/invoices", authMiddleware.Authenticate())
	{
		invoicesGroup.GET("", ctrl.ListInvoices, authMiddleware.RequirePermission("orders", "view"))
		invoicesGroup.GET("/:id", ctrl.FindInvoiceByID, authMiddleware.RequirePermission("orders", "view_detail"))
		invoicesGroup.POST("/:id/annul", ctrl.AnnulInvoice, authMiddleware.RequirePermission("invoices", "annul"))
	}
}
