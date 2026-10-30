package routes

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/quotations/controllers"

	"github.com/labstack/echo/v4"
)

func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.QuotationController) {
	q := e.Group("/quotations", authMiddleware.Authenticate())
	{
		q.GET("", ctrl.List)
		q.GET("/:id", ctrl.GetByID)
		q.POST("", ctrl.Create)
		q.PUT("/:id", ctrl.Update)
	}
}

