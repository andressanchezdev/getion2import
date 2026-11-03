package controllers

// swagger_controller.go · controlador para servir la especificación OpenAPI y la interfaz Swagger UI
// conecta con: swagger_routes.go y los assets embebidos swagger.json e index.html

import (
	_ "embed"
	"net/http"

	"github.com/labstack/echo/v4"
)

//go:embed assets/swagger.json
var swaggerJSON []byte

//go:embed assets/index.html
var swaggerHTML []byte

type SwaggerController struct{}

func NewSwaggerController() *SwaggerController {
	return &SwaggerController{}
}

// GetDoc devuelve la especificación completa de Swagger en formato JSON
func (c *SwaggerController) GetDoc(ctx echo.Context) error {
	return ctx.Blob(http.StatusOK, "application/json; charset=utf-8", swaggerJSON)
}

// GetUI sirve la interfaz interactiva de Swagger UI
func (c *SwaggerController) GetUI(ctx echo.Context) error {
	return ctx.Blob(http.StatusOK, "text/html; charset=utf-8", swaggerHTML)
}
