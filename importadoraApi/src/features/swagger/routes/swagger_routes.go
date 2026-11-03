package routes

// swagger_routes.go · rutas públicas para la documentación técnica interactiva Swagger
// conecta con: controllers.SwaggerController y bootstrap/router.go

import (
	"importadoraApi/src/features/swagger/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes registra los endpoints de documentación Swagger
func RegisterRoutes(e *echo.Echo, ctrl *controllers.SwaggerController) {
	group := e.Group("/swagger")
	{
		group.GET("", ctrl.GetUI)
		group.GET("/", ctrl.GetUI)
		group.GET("/index.html", ctrl.GetUI)
		group.GET("/doc.json", ctrl.GetDoc)
	}
}

