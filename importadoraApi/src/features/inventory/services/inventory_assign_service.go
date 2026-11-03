package services

// inventory_assign_service.go · asignar un producto del catálogo a una ubicación de una bodega, con unidades iniciales
// conecta con: inventory_repo (UpsertStockDelta y kardex), warehouse_repo (bodega y ubicación) y product_repo (el producto); lo llama stock_controller

import (
	"context"
	"fmt"
	"strings"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/inventory/dtos"
	"importadoraApi/src/features/inventory/repositories"

	"github.com/jackc/pgx/v5"
)

// AssignStock suma unidades de un producto en una ubicación activa de la bodega (si ya hay existencias ahí, las aumenta) y deja el movimiento en el kardex.
// ojo: no hay bodega ni ubicación libres: la ubicación debe existir y estar activa en esa bodega; una cantidad cero o negativa se rechaza
func (s *InventoryService) AssignStock(ctx context.Context, actor *middlewares.ActorContext, req dtos.AssignStockRequest, ip, ua string) (*dtos.WarehouseStockResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	location := strings.TrimSpace(req.Location)
	if location == "" {
		return nil, utils.BadRequest("INVALID_LOCATION", "La ubicación no puede estar vacía.")
	}
	if req.Quantity < 1 {
		return nil, utils.BadRequest("INVALID_QTY", "La cantidad debe ser de al menos 1 unidad.")
	}

	warehouse, err := s.warehouseRepo.FindByID(ctx, s.pool, req.WarehouseID)
	if err != nil {
		return nil, utils.Internal("Error al consultar la bodega.", err)
	}
	if warehouse == nil {
		return nil, utils.NotFound("WAREHOUSE_NOT_FOUND", "La bodega no existe.")
	}
	if actor.ActorType != types.ActorSuperadmin && (actor.CompanyID == nil || *actor.CompanyID != warehouse.CompanyID) {
		return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para modificar existencias en esta compañía.")
	}

	product, err := s.productRepo.FindByID(ctx, s.pool, req.ProductID)
	if err != nil {
		return nil, utils.Internal("Error al consultar el producto.", err)
	}
	if product == nil || product.CompanyID != warehouse.CompanyID {
		return nil, utils.NotFound("PRODUCT_NOT_FOUND", "El producto no existe en el catálogo de esta compañía.")
	}

	loc, err := s.warehouseRepo.FindLocationByCode(ctx, s.pool, warehouse.ID, location)
	if err != nil {
		return nil, utils.Internal("Error al consultar la ubicación.", err)
	}
	if loc == nil || !loc.IsActive {
		return nil, utils.BadRequest("LOCATION_NOT_FOUND", fmt.Sprintf("La ubicación '%s' no existe o está inactiva en esta bodega. Créala primero en Gestión Inventario > Ubicaciones.", location))
	}

	var empID *int64
	if actor.ActorType == types.ActorEmployee {
		empID = &actor.ActorID
	}
	reason := strings.TrimSpace(req.Reason)
	if reason == "" {
		reason = "Asignación a ubicación"
	}

	var stock *repositories.StockEntity
	err = db.WithTx(ctx, s.pool, func(tx pgx.Tx) error {
		up, err := s.inventoryRepo.UpsertStockDelta(ctx, tx, warehouse.CompanyID, product.ID, warehouse.ID, location, req.Quantity, 0)
		if err != nil {
			return err
		}
		stock = up
		previous := up.Available - req.Quantity
		current := up.Available
		_, err = s.inventoryRepo.RecordMovement(ctx, tx, &repositories.AuditMovementEntity{
			CompanyID:    up.CompanyID,
			StockID:      up.ID,
			EmployeeID:   empID,
			MovementType: types.MovementAdjustment,
			Quantity:     req.Quantity,
			PreviousQty:  &previous,
			NewQty:       &current,
			Reason:       &reason,
		})
		return err
	})
	if err != nil {
		return nil, utils.Internal("Error al asignar el producto a la ubicación.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &stock.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "stock",
		EntityID:  &stock.ID,
		Action:    "STOCK_ASSIGNED",
		Reason:    fmt.Sprintf("Se asignaron %d unidades de '%s' a la ubicación '%s'", req.Quantity, product.Code, location),
		IPAddress: ip,
		UserAgent: ua,
	})

	return &dtos.WarehouseStockResponse{
		StockID:       stock.ID,
		CompanyID:     stock.CompanyID,
		WarehouseID:   stock.WarehouseID,
		WarehouseName: warehouse.Name,
		ProductID:     stock.ProductID,
		ProductCode:   product.Code,
		ProductName:   product.Name,
		Location:      stock.Location,
		Available:     stock.Available,
		Reserved:      stock.Reserved,
		Sellable:      stock.Available - stock.Reserved,
	}, nil
}
