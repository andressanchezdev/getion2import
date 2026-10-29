package routes

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/auth/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes registra los endpoints del ciclo de autenticación y sesiones
func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.AuthController) {
	group := e.Group("/auth")
	{
		// Endpoints públicos
		group.POST("/login", ctrl.Login)
		group.POST("/refresh", ctrl.Refresh)

		// Endpoints protegidos por JWT
		protected := group.Group("", authMiddleware.Authenticate())
		{
			protected.POST("/logout", ctrl.Logout)
			protected.GET("/me", ctrl.GetMe)
		}
	}
}

