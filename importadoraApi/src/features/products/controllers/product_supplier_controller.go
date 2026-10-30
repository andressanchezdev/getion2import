package controllers

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/products/dtos"

	"github.com/labstack/echo/v4"
)

// ListSuppliers GET /products/:id/suppliers
func (c *ProductController) ListSuppliers(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	suppliers, err := c.service.ListSuppliers(ctx.Request().Context(), actor, id)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Proveedores del producto obtenidos", suppliers)
}

// AssignSupplier POST /products/:id/suppliers
func (c *ProductController) AssignSupplier(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	var req dtos.AssignProductSupplierRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	if err := c.service.AssignSupplier(ctx.Request().Context(), actor, id, req, ip, ua); err != nil {
		return err
	}
	return utils.RespondOK[any](ctx, "Proveedor asignado/actualizado en producto exitosamente", nil)
}

// RemoveSupplier DELETE /products/:id/suppliers/:supplierId
func (c *ProductController) RemoveSupplier(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	supplierID, err := utils.ParamInt64(ctx, "supplierId")
	if err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	if err := c.service.RemoveSupplier(ctx.Request().Context(), actor, id, supplierID, ip, ua); err != nil {
		return err
	}
	return utils.RespondNoContent(ctx)
}

