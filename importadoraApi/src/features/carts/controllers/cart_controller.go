package controllers

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/carts/dtos"
	"importadoraApi/src/features/carts/services"

	"github.com/labstack/echo/v4"
)

type CartController struct {
	service *services.CartService
}

func NewCartController(service *services.CartService) *CartController {
	return &CartController{service: service}
}

// GetActiveCart GET /carts/active
func (c *CartController) GetActiveCart(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	res, err := c.service.GetActiveCart(ctx.Request().Context(), actor)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Carrito activo obtenido", res)
}

// GetByID GET /carts/:id
func (c *CartController) GetByID(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	res, err := c.service.GetByID(ctx.Request().Context(), actor, id)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Detalle de carrito obtenido", res)
}

// Create POST /carts
func (c *CartController) Create(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	var req dtos.CreateCartRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	res, err := c.service.Create(ctx.Request().Context(), actor, req)
	if err != nil {
		return err
	}
	return utils.RespondCreated(ctx, "Carrito creado exitosamente", res)
}

// AddItem POST /carts/:id/items
func (c *CartController) AddItem(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	var req dtos.AddCartItemRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	res, err := c.service.AddItem(ctx.Request().Context(), actor, id, req)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Ítem agregado al carrito", res)
}

// UpdateItem PUT /carts/:id/items/:itemId
func (c *CartController) UpdateItem(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	cartID, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}
	itemID, err := utils.ParamInt64(ctx, "itemId")
	if err != nil {
		return err
	}

	var req dtos.UpdateCartItemRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	res, err := c.service.UpdateItem(ctx.Request().Context(), actor, cartID, itemID, req)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Ítem del carrito actualizado", res)
}

// DeleteItem DELETE /carts/:id/items/:itemId
func (c *CartController) DeleteItem(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	cartID, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}
	itemID, err := utils.ParamInt64(ctx, "itemId")
	if err != nil {
		return err
	}

	res, err := c.service.DeleteItem(ctx.Request().Context(), actor, cartID, itemID)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Ítem removido del carrito", res)
}

// ClearCart DELETE /carts/:id
func (c *CartController) ClearCart(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	if err := c.service.ClearCart(ctx.Request().Context(), actor, id); err != nil {
		return err
	}
	return utils.RespondNoContent(ctx)
}
