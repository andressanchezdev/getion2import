package controllers

import (
	"strconv"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/inventory/dtos"

	"github.com/labstack/echo/v4"
)

// ListTransfers GET /transfers
func (c *InventoryController) ListTransfers(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	params := utils.ParsePagination(ctx)

	var companyID *int64
	if cidStr := ctx.QueryParam("companyId"); cidStr != "" {
		if cid, err := strconv.ParseInt(cidStr, 10, 64); err == nil {
			companyID = &cid
		}
	}

	var originWhID *int64
	if owStr := ctx.QueryParam("originWarehouseId"); owStr != "" {
		if ow, err := strconv.ParseInt(owStr, 10, 64); err == nil {
			originWhID = &ow
		}
	}

	var destWhID *int64
	if dwStr := ctx.QueryParam("destinationWarehouseId"); dwStr != "" {
		if dw, err := strconv.ParseInt(dwStr, 10, 64); err == nil {
			destWhID = &dw
		}
	}

	var status *types.TransferStatus
	if st := ctx.QueryParam("status"); st != "" {
		parsed := types.TransferStatus(st)
		status = &parsed
	}

	filter := dtos.TransferFilterQuery{
		CompanyID:              companyID,
		OriginWarehouseID:      originWhID,
		DestinationWarehouseID: destWhID,
		Status:                 status,
		Page:                   params.Page,
		PageSize:               params.PageSize,
	}

	items, meta, err := c.service.ListTransfers(ctx.Request().Context(), actor, filter)
	if err != nil {
		return err
	}
	return utils.RespondPaginated(ctx, "Listado de traslados obtenido", items, *meta)
}

// GetTransferByID GET /transfers/:id
func (c *InventoryController) GetTransferByID(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	res, err := c.service.GetTransferByID(ctx.Request().Context(), actor, id)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Detalle de traslado obtenido", res)
}

// CreateTransfer POST /transfers
func (c *InventoryController) CreateTransfer(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	var req dtos.CreateTransferRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.CreateTransfer(ctx.Request().Context(), actor, req, ip, ua)
	if err != nil {
		return err
	}
	return utils.RespondCreated(ctx, "Traslado registrado exitosamente", res)
}

// DispatchTransfer POST /transfers/:id/dispatch
func (c *InventoryController) DispatchTransfer(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	if err := c.service.DispatchTransfer(ctx.Request().Context(), actor, id, ip, ua); err != nil {
		return err
	}
	return utils.RespondOK[any](ctx, "Traslado despachado exitosamente", nil)
}

// ReceiveTransfer POST /transfers/:id/receive
func (c *InventoryController) ReceiveTransfer(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	var req dtos.ReceiveTransferRequest
	_ = utils.BindJSON(ctx, &req)

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	if err := c.service.ReceiveTransfer(ctx.Request().Context(), actor, id, req, ip, ua); err != nil {
		return err
	}
	return utils.RespondOK[any](ctx, "Traslado recibido e ingresado al inventario exitosamente", nil)
}

// CancelTransfer POST /transfers/:id/cancel
func (c *InventoryController) CancelTransfer(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	var req dtos.CancelTransferRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	if err := c.service.CancelTransfer(ctx.Request().Context(), actor, id, req, ip, ua); err != nil {
		return err
	}
	return utils.RespondOK[any](ctx, "Traslado cancelado y reservas liberadas", nil)
}

