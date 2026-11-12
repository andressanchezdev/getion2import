package services

// product_initial_stock_service · dónde queda guardado un producto recién creado: valida las bodegas y ubicaciones elegidas y crea sus existencias iniciales
// conecta con: ProductService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en product_service.go); lo usa product_write_service (Create)

import (
	"context"
	"fmt"
	"strings"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/events"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	inventoryRepos "importadoraApi/src/features/inventory/repositories"
	"importadoraApi/src/features/products/dtos"
)

// validateInitialStock revisa que cada bodega sea de la compañía, que cada ubicación exista y esté activa en su bodega y que no se repita la misma ubicación.
func (s *ProductService) validateInitialStock(ctx context.Context, companyID int64, items []dtos.InitialStockRequest) error {
	seen := make(map[string]bool, len(items))
	for _, item := range items {
		location := strings.TrimSpace(item.Location)
		if item.Quantity < 0 {
			return utils.BadRequest("INVALID_QUANTITY", "La cantidad inicial no puede ser negativa.")
		}
		key := fmt.Sprintf("%d|%s", item.WarehouseID, location)
		if seen[key] {
			return utils.BadRequest("DUPLICATE_LOCATION", fmt.Sprintf("La ubicación '%s' está repetida para la misma bodega.", location))
		}
		seen[key] = true

		warehouse, err := s.warehouseRepo.FindByID(ctx, s.pool, item.WarehouseID)
		if err != nil {
			return utils.Internal("Error al consultar la bodega.", err)
		}
		if warehouse == nil || warehouse.CompanyID != companyID {
			return utils.BadRequest("INVALID_WAREHOUSE", "La bodega indicada no existe en la compañía.")
		}
		found, err := s.warehouseRepo.FindLocationByCode(ctx, s.pool, item.WarehouseID, location)
		if err != nil {
			return utils.Internal("Error al consultar la ubicación.", err)
		}
		if found == nil || !found.IsActive {
			return utils.BadRequest("LOCATION_NOT_FOUND", fmt.Sprintf("La ubicación '%s' no existe o está inactiva en la bodega %s. Créala primero en Gestión Inventario > Ubicaciones.", location, warehouse.Name))
		}
	}
	return nil
}

// assignInitialStock crea las existencias del producto en cada ubicación elegida; si hay unidades deja el movimiento en el kardex.
func (s *ProductService) assignInitialStock(ctx context.Context, tx db.DBExecutor, actor *middlewares.ActorContext, companyID, productID int64, items []dtos.InitialStockRequest) error {
	var employeeID *int64
	if actor.ActorType == types.ActorEmployee {
		employeeID = &actor.ActorID
	}
	reason := "Existencias iniciales al crear el producto"
	for _, item := range items {
		location := strings.TrimSpace(item.Location)
		stock, err := s.inventoryRepo.UpsertStockDelta(ctx, tx, companyID, productID, item.WarehouseID, location, item.Quantity, 0)
		if err != nil {
			return err
		}
		s.events.Stock(ctx, stock.ID, events.CauseAdjustment())
		if item.Quantity == 0 {
			continue
		}
		previous := stock.Available - item.Quantity
		movement := &inventoryRepos.AuditMovementEntity{
			CompanyID:    companyID,
			StockID:      stock.ID,
			WarehouseID:  item.WarehouseID,
			ProductID:    productID,
			EmployeeID:   employeeID,
			MovementType: types.MovementAdjustment,
			Quantity:     item.Quantity,
			PreviousQty:  &previous,
			NewQty:       &stock.Available,
			Reason:       &reason,
		}
		if _, err := s.inventoryRepo.RecordMovement(ctx, tx, movement); err != nil {
			return err
		}
	}
	return nil
}
