package controllers

import (
	"strconv"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/inventory/dtos"

	"github.com/labstack/echo/v4"
)

// ListCounts GET /counts
func (c *InventoryController) ListCounts(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	params := utils.ParsePagination(ctx)

	var companyID *int64
	if cidStr := ctx.QueryParam("companyId"); cidStr != "" {
		if cid, err := strconv.ParseInt(cidStr, 10, 64); err == nil {
			companyID = &cid
		}
	}

	var warehouseID *int64
	if widStr := ctx.QueryParam("warehouseId"); widStr != "" {
		if wid, err := strconv.ParseInt(widStr, 10, 64); err == nil {
			warehouseID = &wid
		}
	}

	var status *types.CountStatus
	if st := ctx.QueryParam("status"); st != "" {
		parsed := types.CountStatus(st)
		status = &parsed
	}

	filter := dtos.CountFilterQuery{
		CompanyID:   companyID,
		WarehouseID: warehouseID,
		Status:      status,
		Page:        params.Page,
		PageSize:    params.PageSize,
	}

	items, meta, err := c.service.ListCounts(ctx.Request().Context(), actor, filter)
	if err != nil {
		return err
	}
	return utils.RespondPaginated(ctx, "Listado de conteos físicos obtenido", items, *meta)
}

// GetCountByID GET /counts/:id
func (c *InventoryController) GetCountByID(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	res, err := c.service.GetCountByID(ctx.Request().Context(), actor, id)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Detalle de conteo físico obtenido", res)
}

// CreateCount POST /counts
func (c *InventoryController) CreateCount(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	var req dtos.CreateCountRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.CreateCount(ctx.Request().Context(), actor, req, ip, ua)
	if err != nil {
		return err
	}
	return utils.RespondCreated(ctx, "Conteo físico iniciado exitosamente", res)
}

// UpdateCountItems PUT /counts/:id/items
func (c *InventoryController) UpdateCountItems(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	var req dtos.UpdateCountItemsRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	if err := c.service.UpdateCountItems(ctx.Request().Context(), actor, id, req, ip, ua); err != nil {
		return err
	}
	return utils.RespondOK[any](ctx, "Cantidades contadas registradas exitosamente", nil)
}

// VerifyCount POST /counts/:id/verify
func (c *InventoryController) VerifyCount(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	if err := c.service.VerifyCount(ctx.Request().Context(), actor, id, ip, ua); err != nil {
		return err
	}
	return utils.RespondOK[any](ctx, "Conteo marcado como verificado exitosamente", nil)
}

// CorroborateCount POST /counts/:id/corroborate
func (c *InventoryController) CorroborateCount(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	if err := c.service.CorroborateCount(ctx.Request().Context(), actor, id, ip, ua); err != nil {
		return err
	}
	return utils.RespondOK[any](ctx, "Conteo corroborado y ajustes aplicados al stock exitosamente", nil)
}

