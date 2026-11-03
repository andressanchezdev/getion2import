package services

// purchase_receive_service · recepción y anulación de compras y su respuesta
// conecta con: PurchaseService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en purchase_service.go)

import (
	"context"
	"fmt"
	"strings"
	"time"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	inventoryrepos "importadoraApi/src/features/inventory/repositories"
	"importadoraApi/src/features/purchases/dtos"
	"importadoraApi/src/features/purchases/repositories"
)

// Receive recibe físicamente los productos en bodega, actualiza inventario y genera asiento en Kardex (purchase_in).
func (s *PurchaseService) Receive(ctx context.Context, actor *middlewares.ActorContext, purchaseID int64, req dtos.ReceivePurchaseRequest, ip, ua string) (*dtos.PurchaseResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	if len(req.Items) == 0 {
		return nil, utils.BadRequest("EMPTY_ITEMS", "Debe especificar las cantidades a recibir.")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, utils.Internal("Error al iniciar transacción de recepción.", err)
	}
	defer tx.Rollback(ctx)

	p, err := s.purchaseRepo.FindByID(ctx, tx, purchaseID)
	if err != nil {
		return nil, utils.Internal("Error al consultar orden de compra.", err)
	}
	if p == nil {
		return nil, utils.NotFound("PURCHASE_NOT_FOUND", "La orden de compra no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != p.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso sobre esta orden de compra.")
		}
	}

	if p.Status != types.PurchaseOrdered && p.Status != types.PurchasePartial {
		return nil, utils.BadRequest("INVALID_STATUS", fmt.Sprintf("No se puede recibir una orden en estado '%s'.", p.Status))
	}

	items, err := s.purchaseRepo.ListItems(ctx, tx, purchaseID)
	if err != nil {
		return nil, utils.Internal("Error al consultar ítems de la orden de compra.", err)
	}

	itemsMap := make(map[int64]repositories.PurchaseItemEntity)
	for _, it := range items {
		itemsMap[it.ID] = it
	}

	refType := "purchase"
	empID := actor.ActorID
	for _, reqIt := range req.Items {
		item, exists := itemsMap[reqIt.PurchaseItemID]
		if !exists {
			return nil, utils.BadRequest("ITEM_NOT_FOUND", fmt.Sprintf("El ítem %d no pertenece a la orden de compra.", reqIt.PurchaseItemID))
		}
		if reqIt.Quantity <= 0 {
			return nil, utils.BadRequest("INVALID_QUANTITY", "La cantidad a recibir debe ser mayor a 0.")
		}
		if (item.ReceivedQty + reqIt.Quantity) > item.Quantity {
			return nil, utils.BadRequest("EXCEEDS_QUANTITY", fmt.Sprintf("La cantidad a recibir (%d) excede el pendiente (%d) para '%s'.", reqIt.Quantity, item.Quantity-item.ReceivedQty, item.ProductName))
		}

		// 1. Actualizar cantidad recibida en el ítem
		if err := s.purchaseRepo.UpdateItemReceived(ctx, tx, item.ID, reqIt.Quantity); err != nil {
			return nil, utils.Internal("Error al actualizar cantidad recibida.", err)
		}

		// 2. Ingresar stock a la bodega, en la ubicación elegida (debe existir y estar activa en esa bodega)
		location := strings.TrimSpace(reqIt.Location)
		if location != "" {
			loc, err := s.warehouseRepo.FindLocationByCode(ctx, tx, p.WarehouseID, location)
			if err != nil {
				return nil, utils.Internal("Error al consultar la ubicación.", err)
			}
			if loc == nil || !loc.IsActive {
				return nil, utils.BadRequest("LOCATION_NOT_FOUND", fmt.Sprintf("La ubicación '%s' no existe o está inactiva en la bodega de esta orden.", location))
			}
		}
		stockEntity, err := s.inventoryRepo.UpsertStockDelta(ctx, tx, p.CompanyID, item.ProductID, p.WarehouseID, location, reqIt.Quantity, 0)
		if err != nil {
			return nil, utils.Internal("Error al ingresar stock recibido a la bodega.", err)
		}

		// 3. Actualizar costo de última compra en producto
		if err := s.purchaseRepo.UpdateProductLastCost(ctx, tx, item.ProductID, item.UnitCost); err != nil {
			return nil, utils.Internal("Error al actualizar costo del producto.", err)
		}

		// 4. Asentar Kardex purchase_in
		reason := fmt.Sprintf("Recepción en muelle de orden de compra %s", p.SerialCode)
		movement := &inventoryrepos.AuditMovementEntity{
			CompanyID:     p.CompanyID,
			StockID:       stockEntity.ID,
			WarehouseID:   p.WarehouseID,
			ProductID:     item.ProductID,
			EmployeeID:    &empID,
			MovementType:  types.MovementPurchaseIn,
			Quantity:      reqIt.Quantity,
			ReferenceType: &refType,
			ReferenceID:   &p.ID,
			Reason:        &reason,
		}
		if _, err := s.inventoryRepo.RecordMovement(ctx, tx, movement); err != nil {
			return nil, utils.Internal("Error al registrar movimiento en Kardex.", err)
		}
	}

	// Reevaluar si se completó la totalidad de los ítems
	updatedItems, _ := s.purchaseRepo.ListItems(ctx, tx, purchaseID)
	allCompleted := true
	for _, it := range updatedItems {
		if it.ReceivedQty < it.Quantity {
			allCompleted = false
			break
		}
	}

	newStatus := types.PurchasePartial
	var receivedAt *time.Time
	if allCompleted {
		newStatus = types.PurchaseReceived
		now := time.Now()
		receivedAt = &now
	}

	if err := s.purchaseRepo.UpdateStatus(ctx, tx, purchaseID, newStatus, receivedAt); err != nil {
		return nil, utils.Internal("Error al actualizar estado de la orden de compra.", err)
	}

	_ = s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
		CompanyID: &p.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "purchases",
		EntityID:  &p.ID,
		Action:    "PURCHASE_RECEIVED",
		Reason:    fmt.Sprintf("Recepción de mercancía registrada. Estado resultante: %s", newStatus),
		IPAddress: ip,
		UserAgent: ua,
	})

	if err := tx.Commit(ctx); err != nil {
		return nil, utils.Internal("Error al confirmar recepción de compra.", err)
	}

	return s.FindByID(ctx, actor, purchaseID)
}

// Void anula una orden de compra siempre que no haya sido recibida.
func (s *PurchaseService) Void(ctx context.Context, actor *middlewares.ActorContext, purchaseID int64, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	p, err := s.purchaseRepo.FindByID(ctx, s.pool, purchaseID)
	if err != nil {
		return utils.Internal("Error al consultar orden de compra.", err)
	}
	if p == nil {
		return utils.NotFound("PURCHASE_NOT_FOUND", "La orden de compra no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != p.CompanyID {
			return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso sobre esta orden de compra.")
		}
	}

	if p.Status == types.PurchaseReceived || p.Status == types.PurchasePartial {
		return utils.BadRequest("INVALID_STATUS", "No se puede anular una orden de compra que ya tiene recepciones de mercancía.")
	}

	if err := s.purchaseRepo.UpdateStatus(ctx, s.pool, purchaseID, types.PurchaseVoided, nil); err != nil {
		return utils.Internal("Error al anular orden de compra.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &p.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "purchases",
		EntityID:  &p.ID,
		Action:    "PURCHASE_VOIDED",
		Reason:    fmt.Sprintf("Orden de compra %s anulada", p.SerialCode),
		IPAddress: ip,
		UserAgent: ua,
	})

	return nil
}

// mapToDTO convierte la orden de compra de la base en la respuesta que sale por la API.
func (s *PurchaseService) mapToDTO(p *repositories.PurchaseEntity, items []repositories.PurchaseItemEntity) *dtos.PurchaseResponse {
	var expDateStr *string
	if p.ExpectedDate != nil {
		d := p.ExpectedDate.Format("2006-01-02")
		expDateStr = &d
	}

	itemsDTO := make([]dtos.PurchaseItemResponse, 0, len(items))
	for _, it := range items {
		itemsDTO = append(itemsDTO, dtos.PurchaseItemResponse{
			ID:           it.ID,
			PurchaseID:   it.PurchaseID,
			ProductID:    it.ProductID,
			ProductCode:  it.ProductCode,
			ProductName:  it.ProductName,
			SupplierCode: it.SupplierCode,
			Quantity:     it.Quantity,
			ReceivedQty:  it.ReceivedQty,
			UnitCost:     it.UnitCost,
			IVAPercent:   it.IVAPercent,
			Subtotal:     it.Subtotal,
		})
	}

	return &dtos.PurchaseResponse{
		ID:            p.ID,
		CompanyID:     p.CompanyID,
		SerialCode:    p.SerialCode,
		SupplierID:    p.SupplierID,
		SupplierName:  p.SupplierName,
		WarehouseID:   p.WarehouseID,
		WarehouseName: p.WarehouseName,
		EmployeeID:    p.EmployeeID,
		EmployeeName:  p.EmployeeName,
		Status:        p.Status,
		SupplierRef:   p.SupplierRef,
		ExpectedDate:  expDateStr,
		Subtotal:      p.Subtotal,
		IVATotal:      p.IVATotal,
		Total:         p.Total,
		Notes:         p.Notes,
		ReceivedAt:    p.ReceivedAt,
		CreatedAt:     p.CreatedAt,
		UpdatedAt:     p.UpdatedAt,
		Items:         itemsDTO,
	}
}
