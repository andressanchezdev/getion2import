package controllers

import (
	"strconv"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/inventory/dtos"
	"importadoraApi/src/features/inventory/services"

	"github.com/labstack/echo/v4"
)

type InventoryController struct {
	service *services.InventoryService
}

func NewInventoryController(service *services.InventoryService) *InventoryController {
	return &InventoryController{service: service}
}

// ==========================================
// CONTROLADORES DE STOCK
// ==========================================

func (c *InventoryController) ListWarehouseStock(ctx echo.Context) error {
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

	var productID *int64
	if pidStr := ctx.QueryParam("productId"); pidStr != "" {
		if pid, err := strconv.ParseInt(pidStr, 10, 64); err == nil {
			productID = &pid
		}
	}

	var location *string
	if loc := ctx.QueryParam("location"); loc != "" {
		location = &loc
	}

	filter := dtos.StockFilterQuery{
		CompanyID:   companyID,
		WarehouseID: warehouseID,
		ProductID:   productID,
		Location:    location,
		Search:      ctx.QueryParam("q"),
		Page:        params.Page,
		PageSize:    params.PageSize,
	}

	items, meta, err := c.service.ListWarehouseStock(ctx.Request().Context(), actor, filter)
	if err != nil {
		return err
	}
	return utils.RespondPaginated(ctx, "Existencias por bodega obtenidas", items, *meta)
}

func (c *InventoryController) ListCompanyStock(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	var companyID *int64
	if cidStr := ctx.QueryParam("companyId"); cidStr != "" {
		if cid, err := strconv.ParseInt(cidStr, 10, 64); err == nil {
			companyID = &cid
		}
	}

	items, err := c.service.ListCompanyStock(ctx.Request().Context(), actor, companyID)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Existencias consolidadas por compañía obtenidas", items)
}

func (c *InventoryController) AdjustStock(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	var req dtos.AdjustStockRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.AdjustStock(ctx.Request().Context(), actor, req, ip, ua)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Ajuste de inventario aplicado exitosamente", res)
}

func (c *InventoryController) RelocateStock(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	var req dtos.RelocateStockRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	if err := c.service.RelocateStock(ctx.Request().Context(), actor, req, ip, ua); err != nil {
		return err
	}
	return utils.RespondOK[any](ctx, "Reubicación de stock procesada exitosamente", nil)
}

// ==========================================
// CONTROLADORES DE TRASLADOS
// ==========================================

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

// ==========================================
// CONTROLADORES DE CONTEOS FÍSICOS
// ==========================================

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

// ==========================================
// CONTROLADORES DE KARDEX
// ==========================================

func (c *InventoryController) ListMovements(ctx echo.Context) error {
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

	var productID *int64
	if pidStr := ctx.QueryParam("productId"); pidStr != "" {
		if pid, err := strconv.ParseInt(pidStr, 10, 64); err == nil {
			productID = &pid
		}
	}

	var stockID *int64
	if sidStr := ctx.QueryParam("stockId"); sidStr != "" {
		if sid, err := strconv.ParseInt(sidStr, 10, 64); err == nil {
			stockID = &sid
		}
	}

	var movementType *types.MovementType
	if mt := ctx.QueryParam("movementType"); mt != "" {
		parsed := types.MovementType(mt)
		movementType = &parsed
	}

	filter := dtos.MovementFilterQuery{
		CompanyID:    companyID,
		WarehouseID:  warehouseID,
		ProductID:    productID,
		StockID:      stockID,
		MovementType: movementType,
		Page:         params.Page,
		PageSize:     params.PageSize,
	}

	items, meta, err := c.service.ListMovements(ctx.Request().Context(), actor, filter)
	if err != nil {
		return err
	}
	return utils.RespondPaginated(ctx, "Movimientos del kardex obtenidos", items, *meta)
}

