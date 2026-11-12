package services

// cart_item_service.go · reglas de negocio de carritos: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas
// conecta con: los repositories y dtos de carritos; los llama el controller y la conexión llega del contenedor

import (
	"context"
	"encoding/json"
	"fmt"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/events"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/carts/dtos"
	inventoryRepos "importadoraApi/src/features/inventory/repositories"

	"github.com/jackc/pgx/v5"
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

	if err := s.assertCartOwnership(ctx, actor, cart); err != nil {
		return nil, err
	}

	if cart.Status != types.CartOpen {
		return nil, utils.BadRequest("CART_CLOSED", "El carrito no está abierto.")
	}

	// Validar existencia de stock o resolverlo por producto + bodega si stockId no vino
	var stock *inventoryRepos.StockEntity
	if req.StockID > 0 {
		stock, err = s.inventoryRepo.FindStockByID(ctx, s.pool, req.StockID)
	} else {
		whID := req.WarehouseID
		if whID <= 0 && cart.WarehouseID != nil {
			whID = *cart.WarehouseID
		}
		if req.ProductID <= 0 || whID <= 0 {
			return nil, utils.BadRequest("MISSING_STOCK_OR_PRODUCT", "Debes indicar stockId o el par productId y warehouseId.")
		}
		stock, err = s.inventoryRepo.FindBestStockForProduct(ctx, s.pool, cart.CompanyID, req.ProductID, whID)
	}
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

	// Determinar tarifa del producto y calcular precio unitario estrictamente desde el catálogo
	tier := cart.PriceTier
	if req.PriceTier != nil && *req.PriceTier != "" {
		tier = *req.PriceTier
	}

	product, err := s.productRepo.FindByID(ctx, s.pool, stock.ProductID)
	if err != nil || product == nil {
		return nil, utils.NotFound("PRODUCT_NOT_FOUND", "El producto asociado no existe.")
	}

	var prices map[string]float64
	if len(product.Prices) > 0 {
		_ = json.Unmarshal(product.Prices, &prices)
	}

	// ojo: sin respaldo a p1; la línea guarda el nivel elegido y su precio debe ser de ese mismo nivel
	unitPrice, exists := prices[string(tier)]
	if !exists || unitPrice <= 0 {
		return nil, utils.BadRequest("PRICE_NOT_FOUND", fmt.Sprintf("El producto '%s' (%s) no tiene precio configurado para la tarifa %s.", product.Name, product.Code, tier))
	}

	discount := 0.0
	if req.Discount != nil && *req.Discount >= 0 {
		discount = *req.Discount
	}

	var resp *dtos.CartResponse
	err = db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		if err := s.cartRepo.UpsertItem(ctx, tx, cartID, stock.ProductID, stock.ID, req.Quantity, unitPrice, discount, string(tier)); err != nil {
			return utils.Internal("Error al agregar ítem al carrito.", err)
		}

		_ = s.cartRepo.Touch(ctx, tx, cartID)

		updatedCart, err := s.cartRepo.FindByID(ctx, tx, cartID)
		if err != nil || updatedCart == nil {
			updatedCart = cart
		}
		items, err := s.cartRepo.ListItems(ctx, tx, cartID)
		if err != nil {
			return utils.Internal("Error al consultar ítems del carrito.", err)
		}

		resp = s.buildResponse(updatedCart, items)
		if s.events != nil {
			s.events.Record(ctx, events.NewPersonal(events.CartUpdated, &updatedCart.CompanyID, string(actor.ActorType), actor.ActorID, events.CartUpdatedData{Cart: resp}))
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return resp, nil
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

	if err := s.assertCartOwnership(ctx, actor, cart); err != nil {
		return nil, err
	}

	item, err := s.cartRepo.FindItemByID(ctx, s.pool, itemID)
	if err != nil || item == nil || item.CartID != cartID {
		return nil, utils.NotFound("ITEM_NOT_FOUND", "El ítem solicitado no pertenece a este carrito.")
	}

	tier := item.PriceTier
	if req.PriceTier != nil && *req.PriceTier != "" {
		tier = string(*req.PriceTier)
	}

	// Recalcular precio unitario según la tarifa
	product, err := s.productRepo.FindByID(ctx, s.pool, item.ProductID)
	if err != nil || product == nil {
		return nil, utils.NotFound("PRODUCT_NOT_FOUND", "El producto asociado no existe.")
	}

	var prices map[string]float64
	if len(product.Prices) > 0 {
		_ = json.Unmarshal(product.Prices, &prices)
	}

	// ojo: se recalcula siempre con el nivel de la línea; si ese nivel no tiene precio se rechaza en vez de conservar uno viejo
	unitPrice, exists := prices[tier]
	if !exists || unitPrice <= 0 {
		return nil, utils.BadRequest("PRICE_NOT_FOUND", fmt.Sprintf("El producto '%s' (%s) no tiene precio configurado para la tarifa %s.", product.Name, product.Code, tier))
	}

	discount := item.Discount
	if req.Discount != nil && *req.Discount >= 0 {
		discount = *req.Discount
	}

	var resp *dtos.CartResponse
	err = db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		if err := s.cartRepo.UpdateItem(ctx, tx, itemID, req.Quantity, unitPrice, discount, tier); err != nil {
			return utils.Internal("Error al actualizar ítem.", err)
		}

		_ = s.cartRepo.Touch(ctx, tx, cartID)

		updatedCart, err := s.cartRepo.FindByID(ctx, tx, cartID)
		if err != nil || updatedCart == nil {
			updatedCart = cart
		}
		items, err := s.cartRepo.ListItems(ctx, tx, cartID)
		if err != nil {
			return utils.Internal("Error al consultar ítems del carrito.", err)
		}

		resp = s.buildResponse(updatedCart, items)
		if s.events != nil {
			s.events.Record(ctx, events.NewPersonal(events.CartUpdated, &updatedCart.CompanyID, string(actor.ActorType), actor.ActorID, events.CartUpdatedData{Cart: resp}))
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return resp, nil
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

	if err := s.assertCartOwnership(ctx, actor, cart); err != nil {
		return nil, err
	}

	var resp *dtos.CartResponse
	err = db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		if err := s.cartRepo.DeleteItem(ctx, tx, itemID); err != nil {
			return utils.Internal("Error al eliminar ítem.", err)
		}

		_ = s.cartRepo.Touch(ctx, tx, cartID)

		updatedCart, err := s.cartRepo.FindByID(ctx, tx, cartID)
		if err != nil || updatedCart == nil {
			updatedCart = cart
		}
		items, err := s.cartRepo.ListItems(ctx, tx, cartID)
		if err != nil {
			return utils.Internal("Error al consultar ítems del carrito.", err)
		}

		resp = s.buildResponse(updatedCart, items)
		if s.events != nil {
			s.events.Record(ctx, events.NewPersonal(events.CartUpdated, &updatedCart.CompanyID, string(actor.ActorType), actor.ActorID, events.CartUpdatedData{Cart: resp}))
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return resp, nil
}

