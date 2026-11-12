package routes

// screensaver_routes.go · rutas autenticadas de /settings/screensaver; la imagen corresponde a la compañía de la sesión
// conecta con: screensaver_controller y core/bootstrap
// ojo: screensaver:edit no se siembra para empleados; lo guardan el admin de la compañía y el superadmin (gobernanza). Leerlo solo pide sesión: todos ven el protector

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/screensaver/controllers"

	"github.com/labstack/echo/v4"
)

func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.ScreensaverController) {
	protected := e.Group("/settings/screensaver", authMiddleware.Authenticate())
	{
		protected.GET("", ctrl.Get)
		protected.POST("", ctrl.Update, authMiddleware.RequirePermission("screensaver", "edit"))
		protected.PUT("", ctrl.Update, authMiddleware.RequirePermission("screensaver", "edit"))
	}
}
