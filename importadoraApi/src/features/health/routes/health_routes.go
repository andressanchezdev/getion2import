package routes

import (
	"importadoraApi/src/features/health/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes vincula las rutas del módulo health al router de Echo
func RegisterRoutes(e *echo.Echo, ctrl *controllers.HealthController) {
	e.GET("/health", ctrl.Check)
	e.GET("/readiness", ctrl.Readiness)
}

