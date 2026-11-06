package services

// inventory_transfer_service · traslados entre bodegas: listar, crear, despachar, recibir y anular
// conecta con: InventoryService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en inventory_service.go)

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

// ListTransfers lista los traslados según los filtros, limitados a lo que el usuario puede ver.
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
	transferIDs := make([]int64, len(entities))
	for i := range entities {
		transferIDs[i] = entities[i].ID
	}
	itemsMap, _ := s.inventoryRepo.ListTransferItemsByTransferIDs(ctx, s.pool, transferIDs)

	result := make([]dtos.TransferResponse, 0, len(entities))
	for i := range entities {
		items := itemsMap[entities[i].ID]
		result = append(result, *s.mapTransferToDTO(&entities[i], items))
	}

	return result, &meta, nil
}

// GetTransferByID devuelve un traslado con sus renglones, validando que sea de la compañía del usuario.
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

// CreateTransfer crea un traslado entre bodegas y reserva en el origen lo que se va a mover.
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
			IsPriority:             req.IsPriority,
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

// mapTransferToDTO convierte el registro de inventario de la base en la respuesta que sale por la API.
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
		IsPriority:               t.IsPriority,
		Notes:                    t.Notes,
		CancelReason:             t.CancelReason,
		DispatchedAt:             t.DispatchedAt,
		ReceivedAt:               t.ReceivedAt,
		CreatedAt:                t.CreatedAt,
		UpdatedAt:                t.UpdatedAt,
		Items:                    itemsDTO,
	}
}
