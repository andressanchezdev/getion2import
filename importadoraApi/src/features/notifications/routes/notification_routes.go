package routes

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/notifications/controllers"

	"github.com/labstack/echo/v4"
)

func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.NotificationController) {
	g := e.Group("/notifications", authMiddleware.Authenticate())
	{
		g.GET("", ctrl.List)
		g.POST("/:id/read", ctrl.MarkAsRead)
		g.POST("/read-all", ctrl.MarkAllAsRead)
	}
}

