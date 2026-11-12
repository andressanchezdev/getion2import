package services

// inventory_count_service · conteos físicos de inventario: crear, actualizar, verificar y corroborar
// conecta con: InventoryService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en inventory_service.go)

import (
	"context"
	"fmt"
	"time"

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

// ListCounts lista los conteos físicos según los filtros, limitados a lo que el usuario puede ver.
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

// GetCountByID devuelve un conteo físico con sus renglones, validando que sea de la compañía del usuario.
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

// CreateCount crea un conteo físico con los productos de la bodega que se van a contar.
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

	err = db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		var empID *int64
		if actor.ActorType == types.ActorEmployee {
			empID = &actor.ActorID
		}

		cEntity := &repositories.CountEntity{
			CompanyID:   wh.CompanyID,
			WarehouseID: req.WarehouseID,
			EmployeeID:  empID,
			Status:      types.CountPending,
			Notes:       req.Notes,
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
				ProductID:   st.ProductID,
				ProductCode: st.ProductCode,
				ProductName: st.ProductName,
				Location:    st.Location,
				ExpectedQty: st.Available,
			})
		}
		s.events.Record(ctx, events.NewCountCreated(wh.CompanyID, req.WarehouseID, events.CountRow{
			ID:            c.ID,
			WarehouseID:   req.WarehouseID,
			WarehouseName: wh.Name,
			Status:        string(types.CountPending),
			Items:         toEventCountItems(preloadedItems),
			Version:       time.Now().UTC(),
		}))
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

// UpdateCountItems guarda las cantidades contadas de los renglones de un conteo.
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

	err = db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		for _, item := range req.Items {
			if err := s.inventoryRepo.UpdateCountItemQty(ctx, tx, countID, item.StockID, item.CountedQty, empID); err != nil {
				return err
			}
		}
		// avance del conteo: viajan los renglones que se acaban de contar y cuántos van del total
		all, err := s.inventoryRepo.ListCountItems(ctx, tx, countID)
		if err != nil {
			return err
		}
		touched := make(map[int64]bool, len(req.Items))
		for _, item := range req.Items {
			touched[item.StockID] = true
		}
		changedItems := make([]repositories.CountItemEntity, 0, len(req.Items))
		counted := 0
		for _, it := range all {
			if it.CountedQty != nil {
				counted++
			}
			if touched[it.StockID] {
				changedItems = append(changedItems, it)
			}
		}
		s.events.Record(ctx, events.NewCountProgressChanged(count.CompanyID, count.WarehouseID, events.CountProgressChangedData{
			Entity:       events.EntityRef{Kind: "count", ID: countID, Version: time.Now().UTC()},
			Items:        toEventCountItems(changedItems),
			CountedLines: counted,
			TotalLines:   len(all),
		}))
		return nil
	})

	if err != nil {
		return utils.Internal("Error al actualizar cantidades del conteo.", err)
	}

	return nil
}

// VerifyCount verifica el conteo físico y ajusta las existencias a lo contado.
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

	// la verificación, su auditoría y su evento van en la misma transacción
	err = db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		if err := s.inventoryRepo.VerifyCount(ctx, tx, countID); err != nil {
			return err
		}
		_ = s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
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
		s.events.Record(ctx, events.NewCountStatusChanged(count.CompanyID, count.WarehouseID, events.CountStatusChangedData{
			Entity:      events.EntityRef{Kind: "count", ID: countID, Version: time.Now().UTC()},
			From:        string(count.Status),
			To:          string(types.CountVerified),
			Differences: []events.CountDifference{},
		}))
		return nil
	})
	if err != nil {
		return utils.Internal("Error al verificar conteo.", err)
	}
	return nil
}

// CorroborateCount corrobora el conteo físico con una segunda persona.
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

	err = db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
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
				s.events.Stock(ctx, item.StockID, events.CauseCountAdjust(countID))

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

		if err := s.inventoryRepo.CorroborateCount(ctx, tx, countID); err != nil {
			return err
		}
		differences := make([]events.CountDifference, 0)
		for _, item := range items {
			if item.CountedQty != nil && *item.CountedQty != item.ExpectedQty {
				differences = append(differences, events.CountDifference{ProductID: item.ProductID, Location: item.Location, ExpectedQty: item.ExpectedQty, CountedQty: *item.CountedQty})
			}
		}
		s.events.Record(ctx, events.NewCountStatusChanged(count.CompanyID, count.WarehouseID, events.CountStatusChangedData{
			Entity:      events.EntityRef{Kind: "count", ID: countID, Version: time.Now().UTC()},
			From:        string(count.Status),
			To:          string(types.CountCorroborated),
			Differences: differences,
		}))
		return nil
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

// mapCountToDTO convierte el registro de inventario de la base en la respuesta que sale por la API.
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

// toEventCountItems pasa los renglones del conteo a la forma que viaja en los eventos count.*
func toEventCountItems(items []repositories.CountItemEntity) []events.CountItem {
	out := make([]events.CountItem, 0, len(items))
	for _, it := range items {
		stockID := it.StockID
		out = append(out, events.CountItem{
			ProductID:   it.ProductID,
			ProductCode: it.ProductCode,
			ProductName: it.ProductName,
			Location:    it.Location,
			ExpectedQty: it.ExpectedQty,
			CountedQty:  it.CountedQty,
			StockID:     &stockID,
		})
	}
	return out
}
