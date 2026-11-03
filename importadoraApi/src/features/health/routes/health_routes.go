package routes

// health_routes.go · rutas HTTP de salud del servicio y los roles o permisos que exige cada una
// conecta con: los controllers de salud del servicio y core/middlewares (autenticación y permisos); los arma core/bootstrap

import (
	"importadoraApi/src/features/health/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes vincula las rutas del módulo health al router de Echo
func RegisterRoutes(e *echo.Echo, ctrl *controllers.HealthController) {
	e.GET("/health", ctrl.Check)
	e.GET("/readiness", ctrl.Readiness)
}
