package services

import (
	"context"
	"fmt"
	"strings"

	"importadoraApi/src/core/config"
	"importadoraApi/src/core/db"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/inventory/dtos"
	"importadoraApi/src/features/inventory/repositories"
	productRepos "importadoraApi/src/features/products/repositories"
	warehouseRepos "importadoraApi/src/features/warehouses/repositories"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type InventoryService struct {
	cfg           *config.Config
	pool          *pgxpool.Pool
	inventoryRepo *repositories.InventoryRepository
	productRepo   *productRepos.ProductRepository
	warehouseRepo *warehouseRepos.WarehouseRepository
	auditRepo     *authRepos.AuditRepository
}

func NewInventoryService(
	cfg *config.Config,
	pool *pgxpool.Pool,
	inventoryRepo *repositories.InventoryRepository,
	productRepo *productRepos.ProductRepository,
	warehouseRepo *warehouseRepos.WarehouseRepository,
	auditRepo *authRepos.AuditRepository,
) *InventoryService {
	return &InventoryService{
		cfg:           cfg,
		pool:          pool,
		inventoryRepo: inventoryRepo,
		productRepo:   productRepo,
		warehouseRepo: warehouseRepo,
		auditRepo:     auditRepo,
	}
}

// ==========================================
// SERVICIOS DE STOCK
// ==========================================

func (s *InventoryService) ListWarehouseStock(ctx context.Context, actor *middlewares.ActorContext, filter dtos.StockFilterQuery) ([]dtos.WarehouseStockResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		filter.CompanyID = actor.CompanyID
	}

	items, total, err := s.inventoryRepo.ListWarehouseStock(ctx, s.pool, filter)
	if err != nil {
		return nil, nil, utils.Internal("Error al listar existencias.", err)
	}

	meta := utils.BuildMeta(filter.Page, filter.PageSize, total)
	return items, &meta, nil
}

func (s *InventoryService) ListCompanyStock(ctx context.Context, actor *middlewares.ActorContext, targetCompanyID *int64) ([]dtos.CompanyStockResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	companyID := targetCompanyID
	if actor.ActorType != types.ActorSuperadmin {
		companyID = actor.CompanyID
	}
	if companyID == nil {
		return nil, utils.BadRequest("MISSING_COMPANY_ID", "El ID de compañía es requerido.")
	}

	return s.inventoryRepo.ListCompanyStock(ctx, s.pool, *companyID)
}

func (s *InventoryService) AdjustStock(ctx context.Context, actor *middlewares.ActorContext, req dtos.AdjustStockRequest, ip, ua string) (*dtos.WarehouseStockResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	stock, err := s.inventoryRepo.FindStockByID(ctx, s.pool, req.StockID)
	if err != nil {
		return nil, utils.Internal("Error al consultar registro de stock.", err)
	}
	if stock == nil {
		return nil, utils.NotFound("STOCK_NOT_FOUND", "El registro de existencias no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != stock.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para modificar existencias en esta compañía.")
		}
	}

	if req.NewQty < stock.Reserved {
		return nil, utils.BadRequest("INVALID_QTY", fmt.Sprintf("La nueva cantidad (%d) no puede ser menor a las unidades reservadas (%d).", req.NewQty, stock.Reserved))
	}

	delta := req.NewQty - stock.Available
	previousQty := stock.Available
	newQty := req.NewQty

	var updatedStock *repositories.StockEntity
	err = db.WithTx(ctx, s.pool, func(tx pgx.Tx) error {
		up, err := s.inventoryRepo.SetStockAvailable(ctx, tx, req.StockID, req.NewQty)
		if err != nil {
			return err
		}
		updatedStock = up

		// Registrar asiento en kardex (audit_movements)
		var empID *int64
		if actor.ActorType == types.ActorEmployee {
			empID = &actor.ActorID
		}

		movement := &repositories.AuditMovementEntity{
			CompanyID:     stock.CompanyID,
			StockID:       stock.ID,
			EmployeeID:    empID,
			MovementType:  types.MovementAdjustment,
			Quantity:      delta,
			PreviousQty:   &previousQty,
			NewQty:        &newQty,
			Reason:        &req.Reason,
		}
		_, err = s.inventoryRepo.RecordMovement(ctx, tx, movement)
		return err
	})

	if err != nil {
		return nil, utils.Internal("Error al ajustar existencias.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &stock.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "stock",
		EntityID:  &stock.ID,
		Action:    "STOCK_ADJUSTED",
		Reason:    fmt.Sprintf("Ajuste manual de stock de %d a %d unidades. Razón: %s", previousQty, newQty, req.Reason),
		IPAddress: ip,
		UserAgent: ua,
	})

	filter := dtos.StockFilterQuery{
		CompanyID:   &updatedStock.CompanyID,
		WarehouseID: &updatedStock.WarehouseID,
		ProductID:   &updatedStock.ProductID,
		Location:    &updatedStock.Location,
		Page:        1,
		PageSize:    1,
	}
	items, _, _ := s.inventoryRepo.ListWarehouseStock(ctx, s.pool, filter)
	if len(items) > 0 {
		return &items[0], nil
	}
	return nil, nil
}

func (s *InventoryService) RelocateStock(ctx context.Context, actor *middlewares.ActorContext, req dtos.RelocateStockRequest, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	destLoc := strings.TrimSpace(req.DestinationLocation)
	if destLoc == "" {
		return utils.BadRequest("INVALID_LOCATION", "La ubicación destino no puede estar vacía.")
	}

	origin, err := s.inventoryRepo.FindStockByID(ctx, s.pool, req.OriginStockID)
	if err != nil {
		return utils.Internal("Error al consultar stock de origen.", err)
	}
	if origin == nil {
		return utils.NotFound("STOCK_NOT_FOUND", "El registro de stock de origen no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != origin.CompanyID {
			return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para reubicar existencias en esta compañía.")
		}
	}

	if origin.Location == destLoc {
		return utils.BadRequest("SAME_LOCATION", "La ubicación destino debe ser diferente a la ubicación actual.")
	}

	sellable := origin.Available - origin.Reserved
	if req.Quantity > sellable {
		return utils.BadRequest("INSUFFICIENT_STOCK", fmt.Sprintf("Cantidad disponible vendible insuficiente (%d disponibles para mover, solicitados %d).", sellable, req.Quantity))
	}

	var empID *int64
	if actor.ActorType == types.ActorEmployee {
		empID = &actor.ActorID
	}

	err = db.WithTx(ctx, s.pool, func(tx pgx.Tx) error {
		// Descontar de origen
		if err := s.inventoryRepo.DeductStock(ctx, tx, origin.ID, req.Quantity, false); err != nil {
			return err
		}

		// Sumar o crear en destino (misma bodega, nueva ubicación)
		destStock, err := s.inventoryRepo.UpsertStockDelta(ctx, tx, origin.CompanyID, origin.ProductID, origin.WarehouseID, destLoc, req.Quantity, 0)
		if err != nil {
			return err
		}

		// Movimiento kardex origen
		prevOrigin := origin.Available
		newOrigin := origin.Available - req.Quantity
		reasonOut := fmt.Sprintf("Reubicación hacia %s. %s", destLoc, req.Reason)
		if _, err := s.inventoryRepo.RecordMovement(ctx, tx, &repositories.AuditMovementEntity{
			CompanyID:    origin.CompanyID,
			StockID:      origin.ID,
			EmployeeID:   empID,
			MovementType: types.MovementAdjustment,
			Quantity:     -req.Quantity,
			PreviousQty:  &prevOrigin,
			NewQty:       &newOrigin,
			Reason:       &reasonOut,
		}); err != nil {
			return err
		}

		// Movimiento kardex destino
		prevDest := destStock.Available - req.Quantity
		newDest := destStock.Available
		reasonIn := fmt.Sprintf("Reubicación desde %s. %s", origin.Location, req.Reason)
		if _, err := s.inventoryRepo.RecordMovement(ctx, tx, &repositories.AuditMovementEntity{
			CompanyID:    destStock.CompanyID,
			StockID:      destStock.ID,
			EmployeeID:   empID,
			MovementType: types.MovementAdjustment,
			Quantity:     req.Quantity,
			PreviousQty:  &prevDest,
			NewQty:       &newDest,
			Reason:       &reasonIn,
		}); err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return utils.Internal("Error al procesar reubicación interna.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &origin.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "stock",
		EntityID:  &origin.ID,
		Action:    "STOCK_RELOCATED",
		Reason:    fmt.Sprintf("Reubicación interna de %d unidades de '%s' a '%s'", req.Quantity, origin.Location, destLoc),
		IPAddress: ip,
		UserAgent: ua,
	})

	return nil
}

// ==========================================
// SERVICIOS DE TRASLADOS MULTI-ÍTEM
// ==========================================

func (s *InventoryService) ListTransfers(ctx context.Context, actor *middlewares.ActorContext, filter dtos.TransferFilterQuery) ([]dtos.TransferResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		filter.CompanyID = actor.CompanyID
	}

	entities, total, err := s.inventoryRepo.ListTransfers(ctx, s.pool, filter)
	if err != nil {
		return nil, nil, utils.Internal("Error al listar traslados.", err)
	}

	meta := utils.BuildMeta(filter.Page, filter.PageSize, total)
	result := make([]dtos.TransferResponse, 0, len(entities))
	for i := range entities {
		result = append(result, *s.mapTransferToDTO(&entities[i], nil))
	}

	return result, &meta, nil
}

func (s *InventoryService) GetTransferByID(ctx context.Context, actor *middlewares.ActorContext, id int64) (*dtos.TransferResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	transfer, err := s.inventoryRepo.FindTransferByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar traslado.", err)
	}
	if transfer == nil {
		return nil, utils.NotFound("TRANSFER_NOT_FOUND", "El traslado solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != transfer.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para consultar este traslado.")
		}
	}

	items, err := s.inventoryRepo.ListTransferItems(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar ítems del traslado.", err)
	}

	return s.mapTransferToDTO(transfer, items), nil
}

func (s *InventoryService) CreateTransfer(ctx context.Context, actor *middlewares.ActorContext, req dtos.CreateTransferRequest, ip, ua string) (*dtos.TransferResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	if req.OriginWarehouseID == req.DestinationWarehouseID {
		return nil, utils.BadRequest("SAME_WAREHOUSES", "La bodega de origen y la bodega de destino no pueden ser la misma.")
	}

	if len(req.Items) == 0 {
		return nil, utils.BadRequest("NO_ITEMS", "El traslado debe contener al menos 1 producto.")
	}

	// Validar que ambas bodegas existan
	originWh, err := s.warehouseRepo.FindByID(ctx, s.pool, req.OriginWarehouseID)
	if err != nil || originWh == nil {
		return nil, utils.BadRequest("INVALID_ORIGIN_WAREHOUSE", "La bodega de origen especificada no existe.")
	}
	destWh, err := s.warehouseRepo.FindByID(ctx, s.pool, req.DestinationWarehouseID)
	if err != nil || destWh == nil {
		return nil, utils.BadRequest("INVALID_DEST_WAREHOUSE", "La bodega de destino especificada no existe.")
	}

	companyID := originWh.CompanyID
	if destWh.CompanyID != companyID {
		return nil, utils.BadRequest("DIFFERENT_COMPANIES", "Ambas bodegas deben pertenecer a la misma compañía.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != companyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para crear traslados en esta compañía.")
		}
	}

	var createdTransfer *repositories.TransferEntity
	var createdItems []repositories.TransferItemEntity

	err = db.WithTx(ctx, s.pool, func(tx pgx.Tx) error {
		// Generar serial de traslado atómicamente
		serialCode, err := utils.NextSerialCode(ctx, tx, companyID, &req.OriginWarehouseID, types.SeriesTransfer, "TRA-")
		if err != nil {
			return err
		}

		transferEntity := &repositories.TransferEntity{
			CompanyID:              companyID,
			SerialCode:             serialCode,
			OriginWarehouseID:      req.OriginWarehouseID,
			DestinationWarehouseID: req.DestinationWarehouseID,
			EmployeeID:             actor.ActorID,
			Status:                 types.TransferPending,
			Notes:                  req.Notes,
		}

		t, err := s.inventoryRepo.CreateTransfer(ctx, tx, transferEntity)
		if err != nil {
			return err
		}
		createdTransfer = t

		createdItems = make([]repositories.TransferItemEntity, 0, len(req.Items))

		for _, item := range req.Items {
			// Validar stock origen
			stock, err := s.inventoryRepo.FindStockByID(ctx, tx, item.OriginStockID)
			if err != nil || stock == nil || stock.WarehouseID != req.OriginWarehouseID {
				return utils.BadRequest("INVALID_ORIGIN_STOCK", fmt.Sprintf("El stock de origen ID %d no pertenece a la bodega de origen.", item.OriginStockID))
			}

			// Validar producto
			product, err := s.productRepo.FindByID(ctx, tx, item.ProductID)
			if err != nil || product == nil {
				return utils.BadRequest("INVALID_PRODUCT", fmt.Sprintf("El producto ID %d no existe.", item.ProductID))
			}

			// Reservar unidades en origen
			if err := s.inventoryRepo.ReserveStock(ctx, tx, stock.ID, item.Quantity); err != nil {
				return utils.BadRequest("INSUFFICIENT_STOCK", fmt.Sprintf("Stock vendible insuficiente para el producto %s en ubicación '%s'.", product.Code, stock.Location))
			}

			detail := &repositories.TransferItemEntity{
				TransferID:          t.ID,
				ProductID:           item.ProductID,
				ProductCode:         product.Code,
				ProductName:         product.Name,
				OriginStockID:       item.OriginStockID,
				DestinationLocation: strings.TrimSpace(item.DestinationLocation),
				Quantity:            item.Quantity,
				ReceivedQty:         0,
				Notes:               item.Notes,
			}

			createdItem, err := s.inventoryRepo.CreateTransferItem(ctx, tx, detail)
			if err != nil {
				return err
			}
			createdItems = append(createdItems, *createdItem)
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &companyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "transfers",
		EntityID:  &createdTransfer.ID,
		Action:    "TRANSFER_CREATED",
		Reason:    fmt.Sprintf("Creación de traslado %s con %d productos", createdTransfer.SerialCode, len(createdItems)),
		IPAddress: ip,
		UserAgent: ua,
	})

	return s.mapTransferToDTO(createdTransfer, createdItems), nil
}

func (s *InventoryService) DispatchTransfer(ctx context.Context, actor *middlewares.ActorContext, transferID int64, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	transfer, err := s.inventoryRepo.FindTransferByID(ctx, s.pool, transferID)
	if err != nil || transfer == nil {
		return utils.NotFound("TRANSFER_NOT_FOUND", "El traslado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != transfer.CompanyID {
			return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para despachar este traslado.")
		}
	}

	if transfer.Status != types.TransferPending {
		return utils.BadRequest("INVALID_STATUS", fmt.Sprintf("El traslado está en estado '%s', solo se puede despachar si está 'pending'.", transfer.Status))
	}

	items, err := s.inventoryRepo.ListTransferItems(ctx, s.pool, transferID)
	if err != nil {
		return utils.Internal("Error al consultar ítems del traslado.", err)
	}

	var empID *int64
	if actor.ActorType == types.ActorEmployee {
		empID = &actor.ActorID
	}

	err = db.WithTx(ctx, s.pool, func(tx pgx.Tx) error {
		// Descontar stock disponible y reservado en origen y registrar kardex
		for _, item := range items {
			originStock, err := s.inventoryRepo.FindStockByID(ctx, tx, item.OriginStockID)
			if err != nil || originStock == nil {
				return utils.Internal("Error al consultar stock de origen.", err)
			}

			if err := s.inventoryRepo.DeductStock(ctx, tx, item.OriginStockID, item.Quantity, true); err != nil {
				return err
			}

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

		return s.inventoryRepo.DispatchTransfer(ctx, tx, transferID, actor.ActorID)
	})

	if err != nil {
		return utils.Internal("Error al despachar traslado.", err)
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

	return nil
}

func (s *InventoryService) ReceiveTransfer(ctx context.Context, actor *middlewares.ActorContext, transferID int64, req dtos.ReceiveTransferRequest, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	transfer, err := s.inventoryRepo.FindTransferByID(ctx, s.pool, transferID)
	if err != nil || transfer == nil {
		return utils.NotFound("TRANSFER_NOT_FOUND", "El traslado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != transfer.CompanyID {
			return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para recibir este traslado.")
		}
	}

	if transfer.Status != types.TransferInTransit {
		return utils.BadRequest("INVALID_STATUS", fmt.Sprintf("El traslado está en estado '%s', solo se puede recibir si está 'in_transit'.", transfer.Status))
	}

	items, err := s.inventoryRepo.ListTransferItems(ctx, s.pool, transferID)
	if err != nil {
		return utils.Internal("Error al consultar ítems del traslado.", err)
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

	err = db.WithTx(ctx, s.pool, func(tx pgx.Tx) error {
		for _, item := range items {
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

			// Crear o sumar al stock de la bodega destino
			destStock, err := s.inventoryRepo.UpsertStockDelta(ctx, tx, transfer.CompanyID, item.ProductID, transfer.DestinationWarehouseID, destLoc, receivedQty, 0)
			if err != nil {
				return err
			}

			// Actualizar en details_transfer
			if err := s.inventoryRepo.UpdateTransferItemReceived(ctx, tx, item.ID, destStock.ID, receivedQty); err != nil {
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

		return s.inventoryRepo.ReceiveTransfer(ctx, tx, transferID, actor.ActorID)
	})

	if err != nil {
		return utils.Internal("Error al recibir traslado.", err)
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

	return nil
}

func (s *InventoryService) CancelTransfer(ctx context.Context, actor *middlewares.ActorContext, transferID int64, req dtos.CancelTransferRequest, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	transfer, err := s.inventoryRepo.FindTransferByID(ctx, s.pool, transferID)
	if err != nil || transfer == nil {
		return utils.NotFound("TRANSFER_NOT_FOUND", "El traslado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != transfer.CompanyID {
			return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para cancelar este traslado.")
		}
	}

	if transfer.Status != types.TransferPending {
		return utils.BadRequest("INVALID_STATUS", "Solo se pueden cancelar traslados en estado 'pending'.")
	}

	items, err := s.inventoryRepo.ListTransferItems(ctx, s.pool, transferID)
	if err != nil {
		return utils.Internal("Error al consultar ítems del traslado.", err)
	}

	err = db.WithTx(ctx, s.pool, func(tx pgx.Tx) error {
		// Liberar reservas en origen
		for _, item := range items {
			if err := s.inventoryRepo.ReleaseReservation(ctx, tx, item.OriginStockID, item.Quantity); err != nil {
				return err
			}
		}

		return s.inventoryRepo.CancelTransfer(ctx, tx, transferID, req.Reason)
	})

	if err != nil {
		return utils.Internal("Error al cancelar traslado.", err)
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

	return nil
}

// ==========================================
// SERVICIOS DE CONTEOS FÍSICOS
// ==========================================

func (s *InventoryService) ListCounts(ctx context.Context, actor *middlewares.ActorContext, filter dtos.CountFilterQuery) ([]dtos.CountResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		filter.CompanyID = actor.CompanyID
	}

	entities, total, err := s.inventoryRepo.ListCounts(ctx, s.pool, filter)
	if err != nil {
		return nil, nil, utils.Internal("Error al consultar conteos.", err)
	}

	meta := utils.BuildMeta(filter.Page, filter.PageSize, total)
	res := make([]dtos.CountResponse, 0, len(entities))
	for i := range entities {
		res = append(res, *s.mapCountToDTO(&entities[i], nil))
	}

	return res, &meta, nil
}

func (s *InventoryService) GetCountByID(ctx context.Context, actor *middlewares.ActorContext, id int64) (*dtos.CountResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	count, err := s.inventoryRepo.FindCountByID(ctx, s.pool, id)
	if err != nil || count == nil {
		return nil, utils.NotFound("COUNT_NOT_FOUND", "El conteo físico no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != count.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para consultar este conteo.")
		}
	}

	items, err := s.inventoryRepo.ListCountItems(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar ítems del conteo.", err)
	}

	return s.mapCountToDTO(count, items), nil
}

func (s *InventoryService) CreateCount(ctx context.Context, actor *middlewares.ActorContext, req dtos.CreateCountRequest, ip, ua string) (*dtos.CountResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	wh, err := s.warehouseRepo.FindByID(ctx, s.pool, req.WarehouseID)
	if err != nil || wh == nil {
		return nil, utils.BadRequest("INVALID_WAREHOUSE", "La bodega especificada no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != wh.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para crear conteos en esta bodega.")
		}
	}

	var createdCount *repositories.CountEntity
	var preloadedItems []repositories.CountItemEntity

	err = db.WithTx(ctx, s.pool, func(tx pgx.Tx) error {
		var empID *int64
		if actor.ActorType == types.ActorEmployee {
			empID = &actor.ActorID
		}

		cEntity := &repositories.CountEntity{
			CompanyID:     wh.CompanyID,
			WarehouseID:   req.WarehouseID,
			EmployeeID:    empID,
			Status:        types.CountPending,
			Notes:         req.Notes,
		}

		c, err := s.inventoryRepo.CreateCount(ctx, tx, cEntity)
		if err != nil {
			return err
		}
		createdCount = c

		// Precargar el stock actual de la bodega
		stockFilter := dtos.StockFilterQuery{
			CompanyID:   &wh.CompanyID,
			WarehouseID: &req.WarehouseID,
			Page:        1,
			PageSize:    1000,
		}
		stocks, _, err := s.inventoryRepo.ListWarehouseStock(ctx, tx, stockFilter)
		if err != nil {
			return err
		}

		preloadedItems = make([]repositories.CountItemEntity, 0, len(stocks))
		for _, st := range stocks {
			cItem := &repositories.CountItemEntity{
				CountID:     c.ID,
				StockID:     st.StockID,
				ExpectedQty: st.Available,
			}
			if err := s.inventoryRepo.CreateCountItem(ctx, tx, cItem); err != nil {
				return err
			}
			preloadedItems = append(preloadedItems, repositories.CountItemEntity{
				CountID:     c.ID,
				StockID:     st.StockID,
				ProductCode: st.ProductCode,
				ProductName: st.ProductName,
				Location:    st.Location,
				ExpectedQty: st.Available,
			})
		}
		return nil
	})

	if err != nil {
		return nil, utils.Internal("Error al iniciar conteo físico.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &wh.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "counts",
		EntityID:  &createdCount.ID,
		Action:    "COUNT_CREATED",
		Reason:    fmt.Sprintf("Inicio de conteo físico en bodega %s con %d ítems", wh.Name, len(preloadedItems)),
		IPAddress: ip,
		UserAgent: ua,
	})

	return s.mapCountToDTO(createdCount, preloadedItems), nil
}

func (s *InventoryService) UpdateCountItems(ctx context.Context, actor *middlewares.ActorContext, countID int64, req dtos.UpdateCountItemsRequest, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	count, err := s.inventoryRepo.FindCountByID(ctx, s.pool, countID)
	if err != nil || count == nil {
		return utils.NotFound("COUNT_NOT_FOUND", "El conteo físico no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != count.CompanyID {
			return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para actualizar este conteo.")
		}
	}

	if count.Status == types.CountCorroborated {
		return utils.BadRequest("ALREADY_CLOSED", "No se pueden modificar ítems de un conteo ya cerrado y corroborado.")
	}

	var empID *int64
	if actor.ActorType == types.ActorEmployee {
		empID = &actor.ActorID
	}

	err = db.WithTx(ctx, s.pool, func(tx pgx.Tx) error {
		for _, item := range req.Items {
			if err := s.inventoryRepo.UpdateCountItemQty(ctx, tx, countID, item.StockID, item.CountedQty, empID); err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		return utils.Internal("Error al actualizar cantidades del conteo.", err)
	}

	return nil
}

func (s *InventoryService) VerifyCount(ctx context.Context, actor *middlewares.ActorContext, countID int64, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	count, err := s.inventoryRepo.FindCountByID(ctx, s.pool, countID)
	if err != nil || count == nil {
		return utils.NotFound("COUNT_NOT_FOUND", "El conteo físico no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != count.CompanyID {
			return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para verificar este conteo.")
		}
	}

	if err := s.inventoryRepo.VerifyCount(ctx, s.pool, countID); err != nil {
		return utils.Internal("Error al verificar conteo.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &count.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "counts",
		EntityID:  &countID,
		Action:    "COUNT_VERIFIED",
		Reason:    "Verificación preliminar de conteo físico",
		IPAddress: ip,
		UserAgent: ua,
	})

	return nil
}

func (s *InventoryService) CorroborateCount(ctx context.Context, actor *middlewares.ActorContext, countID int64, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	count, err := s.inventoryRepo.FindCountByID(ctx, s.pool, countID)
	if err != nil || count == nil {
		return utils.NotFound("COUNT_NOT_FOUND", "El conteo físico no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != count.CompanyID {
			return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para corroborar este conteo.")
		}
	}

	if count.Status == types.CountCorroborated {
		return utils.BadRequest("ALREADY_CLOSED", "El conteo ya se encuentra cerrado y corroborado.")
	}

	items, err := s.inventoryRepo.ListCountItems(ctx, s.pool, countID)
	if err != nil {
		return utils.Internal("Error al consultar ítems del conteo.", err)
	}

	var empID *int64
	if actor.ActorType == types.ActorEmployee {
		empID = &actor.ActorID
	}

	err = db.WithTx(ctx, s.pool, func(tx pgx.Tx) error {
		// Ajustar las diferencias en stock y generar movimientos de auditoría
		for _, item := range items {
			if item.CountedQty != nil && *item.CountedQty != item.ExpectedQty {
				diff := *item.CountedQty - item.ExpectedQty
				prevQty := item.ExpectedQty
				newQty := *item.CountedQty

				// Actualizar stock
				if _, err := s.inventoryRepo.SetStockAvailable(ctx, tx, item.StockID, newQty); err != nil {
					return err
				}

				// Asiento en audit_movements
				reason := fmt.Sprintf("Ajuste por conteo físico #%d (Esperado: %d, Contado: %d)", countID, item.ExpectedQty, newQty)
				if _, err := s.inventoryRepo.RecordMovement(ctx, tx, &repositories.AuditMovementEntity{
					CompanyID:     count.CompanyID,
					StockID:       item.StockID,
					EmployeeID:    empID,
					MovementType:  types.MovementCountAdjust,
					Quantity:      diff,
					PreviousQty:   &prevQty,
					NewQty:        &newQty,
					ReferenceType: refString("counts"),
					ReferenceID:   &countID,
					Reason:        &reason,
				}); err != nil {
					return err
				}
			}
		}

		return s.inventoryRepo.CorroborateCount(ctx, tx, countID)
	})

	if err != nil {
		return utils.Internal("Error al corroborar conteo y aplicar ajustes.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &count.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "counts",
		EntityID:  &countID,
		Action:    "COUNT_CORROBORATED",
		Reason:    "Cierre de conteo físico y aplicación de ajustes de inventario",
		IPAddress: ip,
		UserAgent: ua,
	})

	return nil
}

// ==========================================
// SERVICIOS DE KARDEX / AUDIT MOVEMENTS
// ==========================================

func (s *InventoryService) ListMovements(ctx context.Context, actor *middlewares.ActorContext, filter dtos.MovementFilterQuery) ([]dtos.AuditMovementResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		filter.CompanyID = actor.CompanyID
	}

	items, total, err := s.inventoryRepo.ListMovements(ctx, s.pool, filter)
	if err != nil {
		return nil, nil, utils.Internal("Error al consultar movimientos del kardex.", err)
	}

	meta := utils.BuildMeta(filter.Page, filter.PageSize, total)
	return items, &meta, nil
}

// ==========================================
// MAPPERS A DTOs
// ==========================================

func (s *InventoryService) mapTransferToDTO(t *repositories.TransferEntity, items []repositories.TransferItemEntity) *dtos.TransferResponse {
	itemsDTO := make([]dtos.TransferItemResponse, 0, len(items))
	for i := range items {
		itemsDTO = append(itemsDTO, dtos.TransferItemResponse{
			ID:                  items[i].ID,
			ProductID:           items[i].ProductID,
			ProductCode:         items[i].ProductCode,
			ProductName:         items[i].ProductName,
			OriginStockID:       items[i].OriginStockID,
			DestinationStockID:  items[i].DestinationStockID,
			DestinationLocation: items[i].DestinationLocation,
			Quantity:            items[i].Quantity,
			ReceivedQty:         items[i].ReceivedQty,
			Notes:               items[i].Notes,
		})
	}

	return &dtos.TransferResponse{
		ID:                       t.ID,
		CompanyID:                t.CompanyID,
		SerialCode:               t.SerialCode,
		OriginWarehouseID:        t.OriginWarehouseID,
		OriginWarehouseName:      t.OriginWarehouseName,
		DestinationWarehouseID:   t.DestinationWarehouseID,
		DestinationWarehouseName: t.DestinationWarehouseName,
		EmployeeID:               t.EmployeeID,
		EmployeeName:             t.EmployeeName,
		DispatchedByEmployeeID:   t.DispatchedByEmployeeID,
		DispatchedByName:         t.DispatchedByName,
		ReceivedByEmployeeID:     t.ReceivedByEmployeeID,
		ReceivedByName:           t.ReceivedByName,
		Status:                   t.Status,
		Notes:                    t.Notes,
		CancelReason:             t.CancelReason,
		DispatchedAt:             t.DispatchedAt,
		ReceivedAt:               t.ReceivedAt,
		CreatedAt:                t.CreatedAt,
		UpdatedAt:                t.UpdatedAt,
		Items:                    itemsDTO,
	}
}

func (s *InventoryService) mapCountToDTO(c *repositories.CountEntity, items []repositories.CountItemEntity) *dtos.CountResponse {
	itemsDTO := make([]dtos.CountItemResponse, 0, len(items))
	for i := range items {
		var diff *int
		if items[i].CountedQty != nil {
			d := *items[i].CountedQty - items[i].ExpectedQty
			diff = &d
		}
		itemsDTO = append(itemsDTO, dtos.CountItemResponse{
			ID:           items[i].ID,
			StockID:      items[i].StockID,
			ProductCode:  items[i].ProductCode,
			ProductName:  items[i].ProductName,
			Location:     items[i].Location,
			ExpectedQty:  items[i].ExpectedQty,
			CountedQty:   items[i].CountedQty,
			Difference:   diff,
			EmployeeID:   items[i].EmployeeID,
			EmployeeName: items[i].EmployeeName,
		})
	}

	return &dtos.CountResponse{
		ID:            c.ID,
		CompanyID:     c.CompanyID,
		WarehouseID:   c.WarehouseID,
		WarehouseName: c.WarehouseName,
		EmployeeID:    c.EmployeeID,
		EmployeeName:  c.EmployeeName,
		Status:        c.Status,
		Notes:         c.Notes,
		CreatedAt:     c.CreatedAt,
		ClosedAt:      c.ClosedAt,
		Items:         itemsDTO,
	}
}

func refString(s string) *string {
	return &s
}

