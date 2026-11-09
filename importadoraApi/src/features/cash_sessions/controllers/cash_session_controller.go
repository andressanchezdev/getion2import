package controllers

// cash_session_controller.go · recibe las peticiones de /cash/sessions (consultar la abierta, abrir y cerrar con sus gastos) y responde
// conecta con: cash_session_service (reglas) y cash_session_dto (formas de entrada y salida)

import (
	"strconv"
	"time"

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

// ListExpenses GET /cash/expenses (warehouseId, from, to, q): los gastos de las cajas cerradas
func (c *CashSessionController) ListExpenses(ctx echo.Context) error {
	params := utils.ParsePagination(ctx)
	filter := dtos.CashExpenseFilter{Search: ctx.QueryParam("q"), Page: params.Page, PageSize: params.PageSize}
	if v, err := strconv.ParseInt(ctx.QueryParam("companyId"), 10, 64); err == nil && v > 0 {
		filter.CompanyID = &v
	}
	if v, err := strconv.ParseInt(ctx.QueryParam("warehouseId"), 10, 64); err == nil && v > 0 {
		filter.WarehouseID = &v
	}
	if t, err := time.Parse("2006-01-02", ctx.QueryParam("from")); err == nil {
		filter.From = &t
	}
	if t, err := time.Parse("2006-01-02", ctx.QueryParam("to")); err == nil {
		filter.To = &t
	}
	items, meta, err := c.service.ListExpenses(ctx.Request().Context(), middlewares.GetActor(ctx), filter)
	if err != nil {
		return err
	}
	return utils.RespondPaginated(ctx, "Gastos de caja obtenidos", items, *meta)
}
