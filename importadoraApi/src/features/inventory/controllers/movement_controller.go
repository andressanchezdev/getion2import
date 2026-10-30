package controllers

import (
	"strconv"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/inventory/dtos"

	"github.com/labstack/echo/v4"
)

// ListMovements GET /audit-movements
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

