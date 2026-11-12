package services

// purchase_receive_service · recepción y anulación de compras y su respuesta
// conecta con: PurchaseService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en purchase_service.go)

import (
	"context"
	"fmt"
	"strings"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/events"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	inventoryrepos "importadoraApi/src/features/inventory/repositories"
	"importadoraApi/src/features/purchases/dtos"
	"importadoraApi/src/features/purchases/repositories"

	"github.com/jackc/pgx/v5"
)

// Receive recibe físicamente los productos en bodega, actualiza inventario y genera asiento en Kardex (purchase_in).
func (s *PurchaseService) Receive(ctx context.Context, actor *middlewares.ActorContext, purchaseID int64, req dtos.ReceivePurchaseRequest, ip, ua string) (*dtos.PurchaseResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	if len(req.Items) == 0 {
		return nil, utils.BadRequest("EMPTY_ITEMS", "Debe especificar las cantidades a recibir.")
	}
	if req.SupplierRef == nil || strings.TrimSpace(*req.SupplierRef) == "" {
		return nil, utils.BadRequest("MISSING_SUPPLIER_INVOICE", "El número de factura física del proveedor (supplierRef) es obligatorio para recibir la mercancía.")
	}

	err := db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		p, err := s.purchaseRepo.FindByID(ctx, tx, purchaseID)
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

		if p.Status != types.PurchaseOrdered && p.Status != types.PurchasePartial {
			return utils.BadRequest("INVALID_STATUS", fmt.Sprintf("No se puede recibir una orden en estado '%s'.", p.Status))
		}

		items, err := s.purchaseRepo.ListItems(ctx, tx, purchaseID)
		if err != nil {
			return utils.Internal("Error al consultar ítems de la orden de compra.", err)
		}

		itemsMap := make(map[int64]repositories.PurchaseItemEntity)
		for _, it := range items {
			itemsMap[it.ID] = it
		}

		refType := "purchase"
		// el kardex guarda el empleado solo si quien recibe es empleado (un administrador no tiene id de empleado)
		var empID *int64
		if actor.ActorType == types.ActorEmployee {
			id := actor.ActorID
			empID = &id
		}
		for _, reqIt := range req.Items {
			item, exists := itemsMap[reqIt.PurchaseItemID]
			if !exists {
				return utils.BadRequest("ITEM_NOT_FOUND", fmt.Sprintf("El ítem %d no pertenece a la orden de compra.", reqIt.PurchaseItemID))
			}
			if reqIt.Quantity <= 0 {
				return utils.BadRequest("INVALID_QUANTITY", "La cantidad a recibir debe ser mayor a 0.")
			}
			if (item.ReceivedQty + reqIt.Quantity) > item.Quantity {
				return utils.BadRequest("EXCEEDS_QUANTITY", fmt.Sprintf("La cantidad a recibir (%d) excede el pendiente (%d) para '%s'.", reqIt.Quantity, item.Quantity-item.ReceivedQty, item.ProductName))
			}

			// 1. Actualizar cantidad recibida en el ítem
			if err := s.purchaseRepo.UpdateItemReceived(ctx, tx, item.ID, reqIt.Quantity); err != nil {
				return utils.Internal("Error al actualizar cantidad recibida.", err)
			}

			// 2. Ingresar stock a la bodega, en la ubicación elegida (debe existir y estar activa en esa bodega)
			location := strings.TrimSpace(reqIt.Location)
			if location != "" {
				loc, err := s.warehouseRepo.FindLocationByCode(ctx, tx, p.WarehouseID, location)
				if err != nil {
					return utils.Internal("Error al consultar la ubicación.", err)
				}
				if loc == nil || !loc.IsActive {
					return utils.BadRequest("LOCATION_NOT_FOUND", fmt.Sprintf("La ubicación '%s' no existe o está inactiva en la bodega de esta orden.", location))
				}
			}
			stockEntity, err := s.inventoryRepo.UpsertStockDelta(ctx, tx, p.CompanyID, item.ProductID, p.WarehouseID, location, reqIt.Quantity, 0)
			if err != nil {
				return utils.Internal("Error al ingresar stock recibido a la bodega.", err)
			}
			s.events.Stock(ctx, stockEntity.ID, events.CausePurchaseIn(p.ID, p.SerialCode))

			// 3. Actualizar costo de última compra en producto
			if err := s.purchaseRepo.UpdateProductLastCost(ctx, tx, item.ProductID, item.UnitCost); err != nil {
				return utils.Internal("Error al actualizar costo del producto.", err)
			}

			// 4. Asentar Kardex purchase_in
			reason := fmt.Sprintf("Recepción en muelle de orden de compra %s", p.SerialCode)
			movement := &inventoryrepos.AuditMovementEntity{
				CompanyID:     p.CompanyID,
				StockID:       stockEntity.ID,
				WarehouseID:   p.WarehouseID,
				ProductID:     item.ProductID,
				EmployeeID:    empID,
				MovementType:  types.MovementPurchaseIn,
				Quantity:      reqIt.Quantity,
				ReferenceType: &refType,
				ReferenceID:   &p.ID,
				Reason:        &reason,
			}
			if _, err := s.inventoryRepo.RecordMovement(ctx, tx, movement); err != nil {
				return utils.Internal("Error al registrar movimiento en Kardex.", err)
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
			return utils.Internal("Error al actualizar estado de la orden de compra.", err)
		}
		lines := make([]events.PurchaseLine, 0, len(updatedItems))
		for _, it := range updatedItems {
			lines = append(lines, events.PurchaseLine{ProductID: it.ProductID, Ordered: it.Quantity, Received: it.ReceivedQty})
		}
		s.events.Record(ctx, events.NewPurchaseStatusChanged(p.CompanyID, p.WarehouseID, events.PurchaseStatusChangedData{
			Entity: events.EntityRef{Kind: "purchase", ID: p.ID, Version: time.Now().UTC()},
			From:   string(p.Status),
			To:     string(newStatus),
			Lines:  lines,
		}))

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
		return nil
	})
	if err != nil {
		return nil, err
	}

	return s.FindByID(ctx, actor, purchaseID)
}

// Void anula una orden de compra siempre que no haya sido recibida.
func (s *PurchaseService) Void(ctx context.Context, actor *middlewares.ActorContext, purchaseID int64, reason, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	reason, verr := utils.ValidateReason(reason)
	if verr != nil {
		return verr
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

	// la anulación, su auditoría y su evento van en la misma transacción
	return db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		if err := s.purchaseRepo.UpdateStatus(ctx, tx, purchaseID, types.PurchaseVoided, nil); err != nil {
			return utils.Internal("Error al anular orden de compra.", err)
		}
		_ = s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
			CompanyID: &p.CompanyID,
			ActorType: actor.ActorType,
			ActorID:   actor.ActorID,
			Entity:    "purchases",
			EntityID:  &p.ID,
			Action:    "PURCHASE_VOIDED",
			Reason:    fmt.Sprintf("Orden de compra %s anulada: %s", p.SerialCode, reason),
			IPAddress: ip,
			UserAgent: ua,
		})
		s.events.Record(ctx, events.NewPurchaseStatusChanged(p.CompanyID, p.WarehouseID, events.PurchaseStatusChangedData{
			Entity: events.EntityRef{Kind: "purchase", ID: p.ID, Version: time.Now().UTC()},
			From:   string(p.Status),
			To:     string(types.PurchaseVoided),
			Lines:  []events.PurchaseLine{},
			Reason: &reason,
		}))
		return nil
	})
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
		PaidTotal:     p.PaidTotal,
		Notes:         p.Notes,
		ReceivedAt:    p.ReceivedAt,
		CreatedAt:     p.CreatedAt,
		UpdatedAt:     p.UpdatedAt,
		Items:         itemsDTO,
	}
}
