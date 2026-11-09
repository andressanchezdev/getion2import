package routes

// cart_routes.go · rutas HTTP de carritos y los roles o permisos que exige cada una
// conecta con: los controllers de carritos y core/middlewares (autenticación y permisos); los arma core/bootstrap

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/carts/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes registra las rutas del módulo y los roles o permisos que exige cada una.
func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.CartController) {
	c := e.Group("/carts", authMiddleware.Authenticate(), middlewares.DenySuperadminWrites())
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
