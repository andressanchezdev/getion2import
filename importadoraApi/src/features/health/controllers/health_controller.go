package controllers

// health_controller.go · controlador HTTP de salud del servicio: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio
// conecta con: los services y dtos de salud del servicio y core/utils (respuestas y errores); los registra routes

import (
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/health/services"

	"github.com/labstack/echo/v4"
)

type HealthController struct {
	service *services.HealthService
}

// NewHealthController crea el controlador con las piezas que necesita para funcionar.
func NewHealthController(service *services.HealthService) *HealthController {
	return &HealthController{service: service}
}

// Check responde GET /health: si el servicio está vivo y cuánto tarda la base.
func (c *HealthController) Check(ctx echo.Context) error {
	res, err := c.service.Check(ctx.Request().Context())
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Servicio activo", res)
}

// Readiness responde GET /ready: si el servicio ya puede recibir tráfico (base conectada).
func (c *HealthController) Readiness(ctx echo.Context) error {
	res, err := c.service.Readiness(ctx.Request().Context())
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Base de datos lista", res)
}

