package routes

// notification_routes.go · rutas HTTP de notificaciones y los roles o permisos que exige cada una
// conecta con: los controllers de notificaciones y core/middlewares (autenticación y permisos); los arma core/bootstrap

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/notifications/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes registra las rutas del módulo y los roles o permisos que exige cada una.
func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.NotificationController) {
	g := e.Group("/notifications", authMiddleware.Authenticate())
	{
		g.GET("", ctrl.List)
		g.POST("/:id/read", ctrl.MarkAsRead)
		g.POST("/read-all", ctrl.MarkAllAsRead)
	}
}
