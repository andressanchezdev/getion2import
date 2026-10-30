package routes

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/recyclebin/controllers"

	"github.com/labstack/echo/v4"
)

func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.RecycleBinController) {
	g := e.Group("/recycle-bin", authMiddleware.Authenticate())
	{
		g.GET("", ctrl.List)
		g.POST("/:id/restore", ctrl.Restore)
	}
}

