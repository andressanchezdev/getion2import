package services

// inventory_transfer_flow_service · avance del traslado: despachar, recibir y anular
// conecta con: InventoryService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en inventory_transfer_service.go)

import (
	"context"
	"fmt"
	"strings"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/events"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/inventory/dtos"
	"importadoraApi/src/features/inventory/repositories"

	"github.com/jackc/pgx/v5"
)

// DispatchTransfer despacha el traslado: descuenta del origen lo reservado y lo deja en tránsito.
func (s *InventoryService) DispatchTransfer(ctx context.Context, actor *middlewares.ActorContext, transferID int64, ip, ua string) (*dtos.TransferResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	transfer, err := s.inventoryRepo.FindTransferByID(ctx, s.pool, transferID)
	if err != nil || transfer == nil {
		return nil, utils.NotFound("TRANSFER_NOT_FOUND", "El traslado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != transfer.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para despachar este traslado.")
		}
	}
	// despacha quien trabaja en la bodega de donde salen los repuestos
	if actor.ActorType == types.ActorEmployee && !employeeInWarehouse(actor, transfer.OriginWarehouseID) {
		return nil, utils.Forbidden("FORBIDDEN_TRANSFER_WAREHOUSE", "Solo la bodega de origen puede despachar este traslado.")
	}

	if transfer.Status != types.TransferPending {
		return nil, utils.BadRequest("INVALID_STATUS", fmt.Sprintf("El traslado está en estado '%s', solo se puede despachar si está 'pending'.", transfer.Status))
	}

	items, err := s.inventoryRepo.ListTransferItems(ctx, s.pool, transferID)
	if err != nil {
		return nil, utils.Internal("Error al consultar ítems del traslado.", err)
	}

	var empID *int64
	if actor.ActorType == types.ActorEmployee {
		empID = &actor.ActorID
	}

	err = db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		// Descontar stock disponible y reservado en origen y registrar kardex
		for _, item := range items {
			originStock, err := s.inventoryRepo.FindStockByID(ctx, tx, item.OriginStockID)
			if err != nil || originStock == nil {
				return utils.Internal("Error al consultar stock de origen.", err)
			}

			if err := s.inventoryRepo.DeductStock(ctx, tx, item.OriginStockID, item.Quantity, true); err != nil {
				return err
			}
			s.events.Stock(ctx, item.OriginStockID, events.CauseTransferOut(transfer.ID, transfer.SerialCode))

			prevQty := originStock.Available
			newQty := originStock.Available - item.Quantity
			reason := fmt.Sprintf("Despacho de traslado %s", transfer.SerialCode)

			if _, err := s.inventoryRepo.RecordMovement(ctx, tx, &repositories.AuditMovementEntity{
				CompanyID:     transfer.CompanyID,
				StockID:       item.OriginStockID,
				EmployeeID:    empID,
				MovementType:  types.MovementTransferOut,
				Quantity:      -item.Quantity,
				PreviousQty:   &prevQty,
				NewQty:        &newQty,
				ReferenceType: refString("transfers"),
				ReferenceID:   &transfer.ID,
				Reason:        &reason,
			}); err != nil {
				return err
			}
		}

		updatedAt, err := s.inventoryRepo.DispatchTransfer(ctx, tx, transferID, actor.ActorID)
		if err != nil {
			return err
		}
		by := s.events.Actor(ctx, tx)
		s.events.Record(ctx, events.NewTransferStatus(transfer.CompanyID, events.TransferStatusChangedData{
			Entity:                 events.EntityRef{Kind: events.KindTransfer, ID: transfer.ID, Version: updatedAt},
			Serial:                 transfer.SerialCode,
			From:                   string(transfer.Status),
			To:                     string(types.TransferInTransit),
			OriginWarehouseID:      transfer.OriginWarehouseID,
			DestinationWarehouseID: transfer.DestinationWarehouseID,
			Lines:                  toTransferEventLines(items),
			DispatchedBy:           &by,
		}))
		return nil
	})

	if err != nil {
		return nil, utils.Internal("Error al despachar traslado.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &transfer.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "transfers",
		EntityID:  &transferID,
		Action:    "TRANSFER_DISPATCHED",
		Reason:    fmt.Sprintf("Despacho del traslado %s a bodega destino", transfer.SerialCode),
		IPAddress: ip,
		UserAgent: ua,
	})

	return s.GetTransferByID(ctx, actor, transferID)
}

// ReceiveTransfer recibe el traslado: suma al destino lo recibido y, si hay novedad, la registra.
func (s *InventoryService) ReceiveTransfer(ctx context.Context, actor *middlewares.ActorContext, transferID int64, req dtos.ReceiveTransferRequest, ip, ua string) (*dtos.TransferResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	transfer, err := s.inventoryRepo.FindTransferByID(ctx, s.pool, transferID)
	if err != nil || transfer == nil {
		return nil, utils.NotFound("TRANSFER_NOT_FOUND", "El traslado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != transfer.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para recibir este traslado.")
		}
	}
	// recibe quien trabaja en la bodega que pidió los repuestos
	if actor.ActorType == types.ActorEmployee && !employeeInWarehouse(actor, transfer.DestinationWarehouseID) {
		return nil, utils.Forbidden("FORBIDDEN_TRANSFER_WAREHOUSE", "Solo la bodega de destino puede recibir este traslado.")
	}

	if transfer.Status != types.TransferInTransit {
		return nil, utils.BadRequest("INVALID_STATUS", fmt.Sprintf("El traslado está en estado '%s', solo se puede recibir si está 'in_transit'.", transfer.Status))
	}

	items, err := s.inventoryRepo.ListTransferItems(ctx, s.pool, transferID)
	if err != nil {
		return nil, utils.Internal("Error al consultar ítems del traslado.", err)
	}

	// Mapear cantidades recibidas por ítem
	reqMap := make(map[int64]dtos.ReceiveTransferItemRequest)
	for _, rItem := range req.Items {
		reqMap[rItem.ItemID] = rItem
	}

	var empID *int64
	if actor.ActorType == types.ActorEmployee {
		empID = &actor.ActorID
	}

	err = db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		hasDiscrepancy := false
		for i, item := range items {
			receivedQty := item.Quantity // por defecto recibe todo lo enviado
			destLoc := item.DestinationLocation

			if custom, exists := reqMap[item.ID]; exists {
				if custom.ReceivedQty > item.Quantity {
					return utils.BadRequest("INVALID_RECEIVED_QTY", fmt.Sprintf("La cantidad recibida (%d) no puede superar la enviada (%d) para el ítem %s.", custom.ReceivedQty, item.Quantity, item.ProductCode))
				}
				receivedQty = custom.ReceivedQty
				if strings.TrimSpace(custom.DestinationLocation) != "" {
					destLoc = strings.TrimSpace(custom.DestinationLocation)
				}
			}
			if receivedQty < item.Quantity {
				hasDiscrepancy = true
			}
			items[i].ReceivedQty = receivedQty
			items[i].DestinationLocation = destLoc

			// Crear o sumar al stock de la bodega destino
			destStock, err := s.inventoryRepo.UpsertStockDelta(ctx, tx, transfer.CompanyID, item.ProductID, transfer.DestinationWarehouseID, destLoc, receivedQty, 0)
			if err != nil {
				return err
			}
			s.events.Stock(ctx, destStock.ID, events.CauseTransferIn(transfer.ID, transfer.SerialCode))

			// Actualizar en details_transfer
			if err := s.inventoryRepo.UpdateTransferItemReceived(ctx, tx, item.ID, destStock.ID, destLoc, receivedQty); err != nil {
				return err
			}

			// Asiento kardex en destino
			prevQty := destStock.Available - receivedQty
			newQty := destStock.Available
			reason := fmt.Sprintf("Recepción de traslado %s", transfer.SerialCode)

			if _, err := s.inventoryRepo.RecordMovement(ctx, tx, &repositories.AuditMovementEntity{
				CompanyID:     transfer.CompanyID,
				StockID:       destStock.ID,
				EmployeeID:    empID,
				MovementType:  types.MovementTransferIn,
				Quantity:      receivedQty,
				PreviousQty:   &prevQty,
				NewQty:        &newQty,
				ReferenceType: refString("transfers"),
				ReferenceID:   &transfer.ID,
				Reason:        &reason,
			}); err != nil {
				return err
			}
		}

		var noveltyNotes *string
		if req.NoveltyNotes != nil {
			if trimmed := strings.TrimSpace(*req.NoveltyNotes); trimmed != "" {
				noveltyNotes = &trimmed
				hasDiscrepancy = true
			}
		}
		targetStatus := types.TransferReceived
		if hasDiscrepancy {
			targetStatus = types.TransferWithNovelty
		}

		updatedAt, err := s.inventoryRepo.ReceiveTransfer(ctx, tx, transferID, actor.ActorID, targetStatus, noveltyNotes)
		if err != nil {
			return err
		}
		by := s.events.Actor(ctx, tx)
		s.events.Record(ctx, events.NewTransferStatus(transfer.CompanyID, events.TransferStatusChangedData{
			Entity:                 events.EntityRef{Kind: events.KindTransfer, ID: transfer.ID, Version: updatedAt},
			Serial:                 transfer.SerialCode,
			From:                   string(transfer.Status),
			To:                     string(targetStatus),
			OriginWarehouseID:      transfer.OriginWarehouseID,
			DestinationWarehouseID: transfer.DestinationWarehouseID,
			Lines:                  toTransferEventLines(items),
			NoveltyNotes:           noveltyNotes,
			ReceivedBy:             &by,
		}))
		return nil
	})

	if err != nil {
		return nil, utils.Internal("Error al recibir traslado.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &transfer.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "transfers",
		EntityID:  &transferID,
		Action:    "TRANSFER_RECEIVED",
		Reason:    fmt.Sprintf("Recepción e ingreso de inventario por traslado %s", transfer.SerialCode),
		IPAddress: ip,
		UserAgent: ua,
	})

	return s.GetTransferByID(ctx, actor, transferID)
}

// CancelTransfer anula un traslado que todavía no se despachó y libera lo reservado.
func (s *InventoryService) CancelTransfer(ctx context.Context, actor *middlewares.ActorContext, transferID int64, req dtos.CancelTransferRequest, ip, ua string) (*dtos.TransferResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	transfer, err := s.inventoryRepo.FindTransferByID(ctx, s.pool, transferID)
	if err != nil || transfer == nil {
		return nil, utils.NotFound("TRANSFER_NOT_FOUND", "El traslado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != transfer.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para cancelar este traslado.")
		}
	}
	// cancela quien trabaja en la bodega de origen (libera su reserva) o en la que lo pidió
	if actor.ActorType == types.ActorEmployee && !employeeInWarehouse(actor, transfer.OriginWarehouseID, transfer.DestinationWarehouseID) {
		return nil, utils.Forbidden("FORBIDDEN_TRANSFER_WAREHOUSE", "Este traslado no es de tu bodega.")
	}

	if transfer.Status != types.TransferPending {
		return nil, utils.BadRequest("INVALID_STATUS", "Solo se pueden cancelar traslados en estado 'pending'.")
	}
	cancelReason, verr := utils.ValidateReason(req.Reason)
	if verr != nil {
		return nil, verr
	}

	items, err := s.inventoryRepo.ListTransferItems(ctx, s.pool, transferID)
	if err != nil {
		return nil, utils.Internal("Error al consultar ítems del traslado.", err)
	}

	err = db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		// Liberar reservas en origen
		for _, item := range items {
			if err := s.inventoryRepo.ReleaseReservation(ctx, tx, item.OriginStockID, item.Quantity); err != nil {
				return err
			}
			s.events.Stock(ctx, item.OriginStockID, events.CauseTransferRelease(transfer.ID, transfer.SerialCode))
		}

		updatedAt, err := s.inventoryRepo.CancelTransfer(ctx, tx, transferID, cancelReason)
		if err != nil {
			return err
		}
		s.events.Record(ctx, events.NewTransferStatus(transfer.CompanyID, events.TransferStatusChangedData{
			Entity:                 events.EntityRef{Kind: events.KindTransfer, ID: transfer.ID, Version: updatedAt},
			Serial:                 transfer.SerialCode,
			From:                   string(transfer.Status),
			To:                     string(types.TransferCancelled),
			OriginWarehouseID:      transfer.OriginWarehouseID,
			DestinationWarehouseID: transfer.DestinationWarehouseID,
			Lines:                  toTransferEventLines(items),
			CancelReason:           &cancelReason,
		}))
		return nil
	})

	if err != nil {
		return nil, utils.Internal("Error al cancelar traslado.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &transfer.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "transfers",
		EntityID:  &transferID,
		Action:    "TRANSFER_CANCELLED",
		Reason:    fmt.Sprintf("Cancelación de traslado %s. Motivo: %s", transfer.SerialCode, req.Reason),
		IPAddress: ip,
		UserAgent: ua,
	})

	return s.GetTransferByID(ctx, actor, transferID)
}
