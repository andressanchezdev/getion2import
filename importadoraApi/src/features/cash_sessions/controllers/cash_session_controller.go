package controllers

// cash_session_controller.go · recibe las peticiones de /cash/sessions (consultar la abierta, abrir y cerrar con sus gastos) y responde
// conecta con: cash_session_service (reglas) y cash_session_dto (formas de entrada y salida)

import (
	"strconv"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/cash_sessions/dtos"
	"importadoraApi/src/features/cash_sessions/services"

	"github.com/labstack/echo/v4"
)

type CashSessionController struct {
	service *services.CashSessionService
}

func NewCashSessionController(service *services.CashSessionService) *CashSessionController {
	return &CashSessionController{service: service}
}

func (c *CashSessionController) GetActive(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	whIDStr := ctx.QueryParam("warehouseId")
	whID, err := strconv.ParseInt(whIDStr, 10, 64)
	if err != nil || whID <= 0 {
		return utils.BadRequest("INVALID_WAREHOUSE_ID", "Parámetro warehouseId inválido.")
	}

	res, err := c.service.GetActive(ctx.Request().Context(), actor, whID)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Turno de caja activo", res)
}

func (c *CashSessionController) Open(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	var req dtos.OpenCashSessionRequest
	if err := ctx.Bind(&req); err != nil {
		return utils.BadRequest("INVALID_BODY", "Cuerpo de solicitud inválido.")
	}

	res, err := c.service.Open(ctx.Request().Context(), actor, req)
	if err != nil {
		return err
	}
	return utils.RespondCreated(ctx, "Turno de caja abierto correctamente", res)
}

func (c *CashSessionController) Close(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	var req dtos.CloseCashSessionRequest
	if err := ctx.Bind(&req); err != nil {
		return utils.BadRequest("INVALID_BODY", "Cuerpo de solicitud inválido.")
	}

	res, err := c.service.Close(ctx.Request().Context(), actor, req)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Turno de caja cerrado correctamente", res)
}
