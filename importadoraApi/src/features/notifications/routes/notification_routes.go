package routes

// notification_routes.go · rutas HTTP de notificaciones y los roles o permisos que exige cada una
// conecta con: los controllers de notificaciones y core/middlewares (autenticación y permisos); los arma core/bootstrap

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/features/notifications/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes registra las rutas del módulo y los roles o permisos que exige cada una.
func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.NotificationController) {
	// ojo: solo empleados y administradores reciben notificaciones; el superadmin no (el servicio lo vuelve a comprobar)
	recipients := middlewares.RequireActors(types.ActorEmployee, types.ActorAdmin)
	g := e.Group("/notifications", authMiddleware.Authenticate())
	{
		g.GET("", ctrl.List, recipients)
		g.POST("/:id/read", ctrl.MarkAsRead, recipients)
		g.POST("/read-all", ctrl.MarkAllAsRead, recipients)
	}
}
