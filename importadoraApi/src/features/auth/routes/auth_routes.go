package routes

// auth_routes.go · rutas HTTP de autenticación y sesiones y los roles o permisos que exige cada una
// conecta con: los controllers de autenticación y sesiones y core/middlewares (autenticación y permisos); los arma core/bootstrap

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
			protected.PUT("/me", ctrl.UpdateMe)
			protected.PUT("/me/password", ctrl.UpdatePassword)
		}
	}
}
