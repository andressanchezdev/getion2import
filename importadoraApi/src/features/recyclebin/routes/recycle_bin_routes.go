package routes

// recycle_bin_routes.go · rutas HTTP de papelera de reciclaje y los roles o permisos que exige cada una
// conecta con: los controllers de papelera de reciclaje y core/middlewares (autenticación y permisos); los arma core/bootstrap

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/features/recyclebin/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes registra las rutas del módulo y los roles o permisos que exige cada una.
func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.RecycleBinController) {
	g := e.Group("/recycle-bin", authMiddleware.Authenticate())
	{
		g.GET("", ctrl.List, authMiddleware.RequirePermission("audit", "view"))
		g.POST("/:id/restore", ctrl.Restore, middlewares.RequireActors(types.ActorSuperadmin))
	}
}
