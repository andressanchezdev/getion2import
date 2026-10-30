package controllers

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/products/dtos"

	"github.com/labstack/echo/v4"
)

// ListCodes GET /products/:id/codes
func (c *ProductController) ListCodes(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	codes, err := c.service.ListCodes(ctx.Request().Context(), actor, id)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Códigos del producto obtenidos", codes)
}

// CreateCode POST /products/:id/codes
func (c *ProductController) CreateCode(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	var req dtos.CreateProductCodeRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.CreateCode(ctx.Request().Context(), actor, id, req, ip, ua)
	if err != nil {
		return err
	}
	return utils.RespondCreated(ctx, "Código asignado exitosamente", res)
}

// DeleteCode DELETE /products/:id/codes/:codeId
func (c *ProductController) DeleteCode(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	codeID, err := utils.ParamInt64(ctx, "codeId")
	if err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	if err := c.service.DeleteCode(ctx.Request().Context(), actor, id, codeID, ip, ua); err != nil {
		return err
	}
	return utils.RespondNoContent(ctx)
}

