package controllers

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

