package routes

// backup_routes.go · rutas HTTP de respaldos; todas son solo para superadmin
// conecta con: el controller de respaldos y core/middlewares (autenticación y rol); los arma core/bootstrap

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/features/backups/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes registra las rutas del módulo y el rol que exige cada una.
func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.BackupController) {
	g := e.Group("/backups", authMiddleware.Authenticate())
	{
		g.GET("", ctrl.List, middlewares.RequireActors(types.ActorSuperadmin))
		g.POST("", ctrl.Create, middlewares.RequireActors(types.ActorSuperadmin))
		g.GET("/:id/download", ctrl.Download, middlewares.RequireActors(types.ActorSuperadmin))
		g.POST("/:id/restore", ctrl.Restore, middlewares.RequireActors(types.ActorSuperadmin))
	}
}
