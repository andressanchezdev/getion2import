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
		st.GET("", ctrl.ListWarehouseStock)
		st.GET("/company", ctrl.ListCompanyStock)
		st.POST("/adjust", ctrl.AdjustStock, authMiddleware.RequirePermission("stock", "edit"))
		st.POST("/assign", ctrl.AssignStock, authMiddleware.RequirePermission("stock", "edit"))
		st.POST("/relocate", ctrl.RelocateStock, authMiddleware.RequirePermission("stock", "edit"))
	}

	// Grupo /transfers
	tr := e.Group("/transfers", authMiddleware.Authenticate())
	{
		tr.GET("", ctrl.ListTransfers)
		tr.GET("/:id", ctrl.GetTransferByID)
		tr.POST("", ctrl.CreateTransfer, authMiddleware.RequirePermission("transfers", "create"))
		tr.POST("/:id/dispatch", ctrl.DispatchTransfer, authMiddleware.RequirePermission("transfers", "edit"))
		tr.POST("/:id/receive", ctrl.ReceiveTransfer, authMiddleware.RequirePermission("transfers", "edit"))
		tr.POST("/:id/cancel", ctrl.CancelTransfer, authMiddleware.RequirePermission("transfers", "edit"))
	}

	// Grupo /counts
	cnt := e.Group("/counts", authMiddleware.Authenticate())
	{
		cnt.GET("", ctrl.ListCounts)
		cnt.GET("/:id", ctrl.GetCountByID)
		cnt.POST("", ctrl.CreateCount, authMiddleware.RequirePermission("stock", "create"))
		cnt.PUT("/:id/items", ctrl.UpdateCountItems, authMiddleware.RequirePermission("stock", "edit"))
		cnt.POST("/:id/verify", ctrl.VerifyCount, authMiddleware.RequirePermission("stock", "edit"))
		cnt.POST("/:id/corroborate", ctrl.CorroborateCount, authMiddleware.RequirePermission("stock", "edit"))
	}

	// Grupo /audit-movements (Kardex operativo)
	mv := e.Group("/audit-movements", authMiddleware.Authenticate())
	{
		mv.GET("", ctrl.ListMovements, authMiddleware.RequirePermission("stock", "view"))
	}
}
