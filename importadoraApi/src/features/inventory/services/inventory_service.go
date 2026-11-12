package services

// inventory_service.go · reglas de negocio de inventario: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas
// conecta con: los repositories y dtos de inventario; los llama el controller y la conexión llega del contenedor

import (
	"context"
	"fmt"
	"strings"

	"importadoraApi/src/core/config"
	"importadoraApi/src/core/db"
	"importadoraApi/src/core/events"
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
	events        *events.Recorder
}

// NewInventoryService crea el servicio con las piezas que necesita para funcionar.
func NewInventoryService(
	cfg *config.Config,
	pool *pgxpool.Pool,
	inventoryRepo *repositories.InventoryRepository,
	productRepo *productRepos.ProductRepository,
	warehouseRepo *warehouseRepos.WarehouseRepository,
	auditRepo *authRepos.AuditRepository,
	events *events.Recorder,
) *InventoryService {
	return &InventoryService{
		cfg:           cfg,
		pool:          pool,
		inventoryRepo: inventoryRepo,
		productRepo:   productRepo,
		warehouseRepo: warehouseRepo,
		auditRepo:     auditRepo,
		events:        events,
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

// ListCompanyStock lista las existencias de toda la compañía, sumadas por producto.
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

// AdjustStock ajusta las existencias de un producto en una bodega y deja el movimiento en el kardex.
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
	err = db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		up, err := s.inventoryRepo.SetStockAvailable(ctx, tx, req.StockID, req.NewQty)
		if err != nil {
			return err
		}
		updatedStock = up
		s.events.Stock(ctx, up.ID, events.CauseAdjustment())

		// Registrar asiento en kardex (audit_movements)
		var empID *int64
		if actor.ActorType == types.ActorEmployee {
			empID = &actor.ActorID
		}

		movement := &repositories.AuditMovementEntity{
			CompanyID:    stock.CompanyID,
			StockID:      stock.ID,
			EmployeeID:   empID,
			MovementType: types.MovementAdjustment,
			Quantity:     delta,
			PreviousQty:  &previousQty,
			NewQty:       &newQty,
			Reason:       &req.Reason,
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

// RelocateStock mueve existencias a otra ubicación dentro de la misma bodega y deja el movimiento en el kardex.
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

	// la ubicación destino debe existir (y estar activa) en el catálogo de ubicaciones de la bodega: así ningún producto queda en un estante que nadie administra
	destination, err := s.warehouseRepo.FindLocationByCode(ctx, s.pool, origin.WarehouseID, destLoc)
	if err != nil {
		return utils.Internal("Error al consultar la ubicación destino.", err)
	}
	if destination == nil || !destination.IsActive {
		return utils.BadRequest("LOCATION_NOT_FOUND", fmt.Sprintf("La ubicación '%s' no existe o está inactiva en esta bodega. Créala primero en Gestión Inventario > Ubicaciones.", destLoc))
	}

	sellable := origin.Available - origin.Reserved
	if req.Quantity > sellable {
		return utils.BadRequest("INSUFFICIENT_STOCK", fmt.Sprintf("Cantidad disponible vendible insuficiente (%d disponibles para mover, solicitados %d).", sellable, req.Quantity))
	}

	var empID *int64
	if actor.ActorType == types.ActorEmployee {
		empID = &actor.ActorID
	}

	err = db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		// Descontar de origen
		if err := s.inventoryRepo.DeductStock(ctx, tx, origin.ID, req.Quantity, false); err != nil {
			return err
		}
		s.events.Stock(ctx, origin.ID, events.CauseRelocation())

		// Sumar o crear en destino (misma bodega, nueva ubicación)
		destStock, err := s.inventoryRepo.UpsertStockDelta(ctx, tx, origin.CompanyID, origin.ProductID, origin.WarehouseID, destLoc, req.Quantity, 0)
		if err != nil {
			return err
		}
		s.events.Stock(ctx, destStock.ID, events.CauseRelocation())

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

// ==========================================
// SERVICIOS DE CONTEOS FÍSICOS
// ==========================================

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

func refString(s string) *string {
	return &s
}
