package routes

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/carts/controllers"

	"github.com/labstack/echo/v4"
)

func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.CartController) {
	c := e.Group("/carts", authMiddleware.Authenticate())
	{
		c.GET("/active", ctrl.GetActiveCart)
		c.POST("", ctrl.Create)
		c.GET("/:id", ctrl.GetByID)
		c.DELETE("/:id", ctrl.ClearCart)

		c.POST("/:id/items", ctrl.AddItem)
		c.PUT("/:id/items/:itemId", ctrl.UpdateItem)
		c.DELETE("/:id/items/:itemId", ctrl.DeleteItem)
	}
}

