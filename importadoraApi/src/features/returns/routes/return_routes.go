package routes

// return_routes.go · rutas HTTP de devoluciones y los roles o permisos que exige cada una
// conecta con: los controllers de devoluciones y core/middlewares (autenticación y permisos); los arma core/bootstrap

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/returns/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes registra los endpoints del módulo de devoluciones
func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.ReturnController) {
	returnsGroup := e.Group("/returns", authMiddleware.Authenticate())
	{
		returnsGroup.POST("", ctrl.Create, authMiddleware.RequirePermission("returns", "create"))
		returnsGroup.GET("", ctrl.List, authMiddleware.RequirePermission("returns", "view"))
		returnsGroup.GET("/:id", ctrl.FindByID, authMiddleware.RequirePermission("returns", "view"))
		returnsGroup.POST("/:id/approve", ctrl.Approve, authMiddleware.RequirePermission("returns", "edit"))
		returnsGroup.POST("/:id/reject", ctrl.Reject, authMiddleware.RequirePermission("returns", "edit"))
	}
}
