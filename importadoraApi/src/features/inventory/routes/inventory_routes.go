package routes

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
		st.POST("/adjust", ctrl.AdjustStock)
		st.POST("/relocate", ctrl.RelocateStock)
	}

	// Grupo /transfers
	tr := e.Group("/transfers", authMiddleware.Authenticate())
	{
		tr.GET("", ctrl.ListTransfers)
		tr.GET("/:id", ctrl.GetTransferByID)
		tr.POST("", ctrl.CreateTransfer)
		tr.POST("/:id/dispatch", ctrl.DispatchTransfer)
		tr.POST("/:id/receive", ctrl.ReceiveTransfer)
		tr.POST("/:id/cancel", ctrl.CancelTransfer)
	}

	// Grupo /counts
	cnt := e.Group("/counts", authMiddleware.Authenticate())
	{
		cnt.GET("", ctrl.ListCounts)
		cnt.GET("/:id", ctrl.GetCountByID)
		cnt.POST("", ctrl.CreateCount)
		cnt.PUT("/:id/items", ctrl.UpdateCountItems)
		cnt.POST("/:id/verify", ctrl.VerifyCount)
		cnt.POST("/:id/corroborate", ctrl.CorroborateCount)
	}

	// Grupo /audit-movements (Kardex operativo)
	mv := e.Group("/audit-movements", authMiddleware.Authenticate())
	{
		mv.GET("", ctrl.ListMovements)
	}
}

