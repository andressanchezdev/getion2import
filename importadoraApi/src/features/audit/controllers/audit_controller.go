package controllers

// audit_controller.go · controlador HTTP de auditoría: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio
// conecta con: los services y dtos de auditoría y core/utils (respuestas y errores); los registra routes

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
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
		Entity:    c.QueryParam("entity"),
		Action:    c.QueryParam("action"),
		ActorType: c.QueryParam("actorType"),
		From:      c.QueryParam("from"),
		To:        c.QueryParam("to"),
		Page:      params.Page,
		PageSize:  params.PageSize,
	}

	list, meta, err := ctrl.service.List(c.Request().Context(), actor, filter)
	if err != nil {
		return err
	}

	return utils.RespondPaginated(c, "Trazabilidad de auditoría obtenida", list, *meta)
}

func (ctrl *AuditController) LogContextChange(c echo.Context) error {
	actor := middlewares.GetActor(c)
	if actor == nil || actor.ActorType != types.ActorSuperadmin {
		return utils.Forbidden("FORBIDDEN_SUPERADMIN", "Solo el SUPERADMIN puede registrar cambios de contexto.")
	}
	var req dtos.ContextChangeRequest
	if err := c.Bind(&req); err != nil {
		return utils.BadRequest("INVALID_BODY", "Cuerpo de petición inválido.")
	}
	if err := ctrl.service.LogContextChange(c.Request().Context(), actor, req, c.RealIP(), c.Request().UserAgent()); err != nil {
		return err
	}
	return utils.RespondOK[any](c, "Cambio de contexto auditado exitosamente", nil)
}
