package controllers

// stock_controller.go · controlador HTTP de inventario: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio
// conecta con: los services y dtos de inventario y core/utils (respuestas y errores); los registra routes

import (
	"strconv"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/inventory/dtos"

	"github.com/labstack/echo/v4"
)

// ListWarehouseStock GET /stock
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

// ListCompanyStock GET /stock/company
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

// AdjustStock POST /stock/adjust
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

// AssignStock POST /stock/assign
func (c *InventoryController) AssignStock(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	var req dtos.AssignStockRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	stock, err := c.service.AssignStock(ctx.Request().Context(), actor, req, utils.EchoClientIP(ctx), ctx.Request().UserAgent())
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Producto asignado a la ubicación", stock)
}

// RelocateStock POST /stock/relocate
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

