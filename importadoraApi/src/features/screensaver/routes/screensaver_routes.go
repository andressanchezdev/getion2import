package routes

// screensaver_routes.go · rutas de /settings/screensaver: GET público (el protector lo lee antes de iniciar sesión); POST y PUT exigen settings.edit
// conecta con: screensaver_controller y core/bootstrap

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/screensaver/controllers"

	"github.com/labstack/echo/v4"
)

func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.ScreensaverController) {
	// Lectura pública/autenticada
	e.GET("/settings/screensaver", ctrl.Get)

	// Modificación autenticada para administrador
	protected := e.Group("/settings/screensaver", authMiddleware.Authenticate())
	{
		protected.POST("", ctrl.Update, authMiddleware.RequirePermission("settings", "edit"))
		protected.PUT("", ctrl.Update, authMiddleware.RequirePermission("settings", "edit"))
	}
}
