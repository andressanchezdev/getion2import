package routes

// quotation_routes.go · rutas HTTP de cotizaciones y los roles o permisos que exige cada una
// conecta con: los controllers de cotizaciones y core/middlewares (autenticación y permisos); los arma core/bootstrap

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/quotations/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes registra las rutas del módulo y los roles o permisos que exige cada una.
func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.QuotationController) {
	q := e.Group("/quotations", authMiddleware.Authenticate())
	{
		q.GET("", ctrl.List, authMiddleware.RequirePermission("quotations", "view"))
		q.GET("/:id", ctrl.GetByID, authMiddleware.RequirePermission("quotations", "view"))
		q.POST("", ctrl.Create, authMiddleware.RequirePermission("quotations", "create"))
		q.PUT("/:id", ctrl.Update, authMiddleware.RequirePermission("quotations", "edit"))
	}
}
