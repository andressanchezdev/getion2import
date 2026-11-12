package routes

// inventory_routes.go · rutas HTTP de inventario y los roles o permisos que exige cada una
// conecta con: los controllers de inventario y core/middlewares (autenticación y permisos); los arma core/bootstrap

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/inventory/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes registra los endpoints de inventario, stock, traslados multi-ítem, conteos físicos y kardex
func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.InventoryController) {
	// Grupo /stock
	st := e.Group("/stock", authMiddleware.Authenticate())
	{
		st.GET("", ctrl.ListWarehouseStock, authMiddleware.RequireAnyPermission("stock:view", "catalog:view", "products:view", "transfers:view", "transfers:create", "orders:advance_stage"))
		st.GET("/company", ctrl.ListCompanyStock, authMiddleware.RequireAnyPermission("stock:view", "catalog:view", "products:view", "transfers:create"))
		st.POST("/adjust", ctrl.AdjustStock, authMiddleware.RequirePermission("stock", "edit"))
		st.POST("/assign", ctrl.AssignStock, authMiddleware.RequirePermission("stock", "edit"))
		st.POST("/relocate", ctrl.RelocateStock, authMiddleware.RequirePermission("stock", "relocate"))
	}

	// Grupo /transfers
	tr := e.Group("/transfers", authMiddleware.Authenticate())
	{
		tr.GET("", ctrl.ListTransfers, authMiddleware.RequirePermission("transfers", "view"))
		tr.GET("/:id", ctrl.GetTransferByID, authMiddleware.RequirePermission("transfers", "view_detail"))
		tr.POST("", ctrl.CreateTransfer, authMiddleware.RequirePermission("transfers", "create"))
		tr.POST("/:id/dispatch", ctrl.DispatchTransfer, authMiddleware.RequirePermission("transfers", "edit"))
		tr.POST("/:id/receive", ctrl.ReceiveTransfer, authMiddleware.RequirePermission("transfers", "receive"))
		tr.POST("/:id/cancel", ctrl.CancelTransfer, authMiddleware.RequirePermission("transfers", "edit"))
	}

	// Grupo /counts
	cnt := e.Group("/counts", authMiddleware.Authenticate())
	{
		cnt.GET("", ctrl.ListCounts, authMiddleware.RequirePermission("stock", "view"))
		cnt.GET("/:id", ctrl.GetCountByID, authMiddleware.RequirePermission("stock", "view_detail"))
		cnt.POST("", ctrl.CreateCount, authMiddleware.RequirePermission("stock", "count"))
		cnt.PUT("/:id/items", ctrl.UpdateCountItems, authMiddleware.RequirePermission("stock", "count"))
		cnt.POST("/:id/verify", ctrl.VerifyCount, authMiddleware.RequirePermission("stock", "count_verify"))
		cnt.POST("/:id/corroborate", ctrl.CorroborateCount, authMiddleware.RequirePermission("stock", "count_verify"))
	}

	// Grupo /audit-movements (Kardex operativo)
	mv := e.Group("/audit-movements", authMiddleware.Authenticate())
	{
		mv.GET("", ctrl.ListMovements, authMiddleware.RequirePermission("stock", "view"))
	}
}
