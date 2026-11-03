package controllers

// audit_controller.go · controlador HTTP de auditoría: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio
// conecta con: los services y dtos de auditoría y core/utils (respuestas y errores); los registra routes

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/audit/dtos"
	"importadoraApi/src/features/audit/services"

	"github.com/labstack/echo/v4"
)

type AuditController struct {
	service *services.AuditService
}

// NewAuditController crea el controlador con las piezas que necesita para funcionar.
func NewAuditController(service *services.AuditService) *AuditController {
	return &AuditController{service: service}
}

// List GET /audit-logs
func (ctrl *AuditController) List(c echo.Context) error {
	actor := middlewares.GetActor(c)
	params := utils.ParsePagination(c)

	filter := dtos.AuditLogFilterQuery{
		Entity:   c.QueryParam("entity"),
		Action:   c.QueryParam("action"),
		Page:     params.Page,
		PageSize: params.PageSize,
	}

	list, meta, err := ctrl.service.List(c.Request().Context(), actor, filter)
	if err != nil {
		return err
	}

	return utils.RespondPaginated(c, "Trazabilidad de auditoría obtenida", list, *meta)
}

