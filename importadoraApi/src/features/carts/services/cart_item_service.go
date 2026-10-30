package services

import (
	"context"
	"encoding/json"
	"fmt"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/carts/dtos"
)

// AddItem agrega un producto al carrito resolviendo tarifa y stock vendible
func (s *CartService) AddItem(ctx context.Context, actor *middlewares.ActorContext, cartID int64, req dtos.AddCartItemRequest) (*dtos.CartResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	cart, err := s.cartRepo.FindByID(ctx, s.pool, cartID)
	if err != nil || cart == nil {
		return nil, utils.NotFound("CART_NOT_FOUND", "El carrito no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != cart.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para modificar este carrito.")
		}
	}

	if cart.Status != types.CartOpen {
		return nil, utils.BadRequest("CART_CLOSED", "El carrito no está abierto.")
	}

	// Validar existencia de stock
	stock, err := s.inventoryRepo.FindStockByID(ctx, s.pool, req.StockID)
	if err != nil || stock == nil {
		return nil, utils.NotFound("STOCK_NOT_FOUND", "El registro de stock no existe.")
	}
	if stock.CompanyID != cart.CompanyID {
		return nil, utils.BadRequest("INVALID_STOCK", "El producto no pertenece a la misma compañía.")
	}

	sellable := stock.Available - stock.Reserved
	if req.Quantity > sellable {
		return nil, utils.BadRequest("INSUFFICIENT_STOCK", fmt.Sprintf("Stock vendible insuficiente (%d disponibles).", sellable))
	}

	// Obtener precio unitario según la tarifa del carrito si no se envía manual
	unitPrice := 0.0
	if req.UnitPrice != nil && *req.UnitPrice >= 0 {
		unitPrice = *req.UnitPrice
	} else {
		product, err := s.productRepo.FindByID(ctx, s.pool, stock.ProductID)
		if err != nil || product == nil {
			return nil, utils.NotFound("PRODUCT_NOT_FOUND", "El producto asociado no existe.")
		}

		var prices map[string]float64
		_ = json.Unmarshal(product.Prices, &prices)
		if val, exists := prices[string(cart.PriceTier)]; exists {
			unitPrice = val
		} else if val, exists := prices["p1"]; exists {
			unitPrice = val
		}
	}

	discount := 0.0
	if req.Discount != nil && *req.Discount >= 0 {
		discount = *req.Discount
	}

	if err := s.cartRepo.UpsertItem(ctx, s.pool, cartID, stock.ProductID, stock.ID, req.Quantity, unitPrice, discount); err != nil {
		return nil, utils.Internal("Error al agregar ítem al carrito.", err)
	}

	_ = s.cartRepo.Touch(ctx, s.pool, cartID)

	items, err := s.cartRepo.ListItems(ctx, s.pool, cartID)
	if err != nil {
		return nil, utils.Internal("Error al consultar ítems del carrito.", err)
	}

	return s.buildResponse(cart, items), nil
}

// UpdateItem modifica cantidad, precio o descuento de un ítem existente
func (s *CartService) UpdateItem(ctx context.Context, actor *middlewares.ActorContext, cartID, itemID int64, req dtos.UpdateCartItemRequest) (*dtos.CartResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	cart, err := s.cartRepo.FindByID(ctx, s.pool, cartID)
	if err != nil || cart == nil {
		return nil, utils.NotFound("CART_NOT_FOUND", "El carrito no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != cart.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para modificar este carrito.")
		}
	}

	item, err := s.cartRepo.FindItemByID(ctx, s.pool, itemID)
	if err != nil || item == nil || item.CartID != cartID {
		return nil, utils.NotFound("ITEM_NOT_FOUND", "El ítem solicitado no pertenece a este carrito.")
	}

	unitPrice := item.UnitPrice
	if req.UnitPrice != nil && *req.UnitPrice >= 0 {
		unitPrice = *req.UnitPrice
	}

	discount := item.Discount
	if req.Discount != nil && *req.Discount >= 0 {
		discount = *req.Discount
	}

	if err := s.cartRepo.UpdateItem(ctx, s.pool, itemID, req.Quantity, unitPrice, discount); err != nil {
		return nil, utils.Internal("Error al actualizar ítem.", err)
	}

	_ = s.cartRepo.Touch(ctx, s.pool, cartID)

	items, err := s.cartRepo.ListItems(ctx, s.pool, cartID)
	if err != nil {
		return nil, utils.Internal("Error al consultar ítems del carrito.", err)
	}

	return s.buildResponse(cart, items), nil
}

// DeleteItem elimina un ítem puntual del carrito
func (s *CartService) DeleteItem(ctx context.Context, actor *middlewares.ActorContext, cartID, itemID int64) (*dtos.CartResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	cart, err := s.cartRepo.FindByID(ctx, s.pool, cartID)
	if err != nil || cart == nil {
		return nil, utils.NotFound("CART_NOT_FOUND", "El carrito no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != cart.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para modificar este carrito.")
		}
	}

	if err := s.cartRepo.DeleteItem(ctx, s.pool, itemID); err != nil {
		return nil, utils.Internal("Error al eliminar ítem.", err)
	}

	_ = s.cartRepo.Touch(ctx, s.pool, cartID)

	items, err := s.cartRepo.ListItems(ctx, s.pool, cartID)
	if err != nil {
		return nil, utils.Internal("Error al consultar ítems del carrito.", err)
	}

	return s.buildResponse(cart, items), nil
}

