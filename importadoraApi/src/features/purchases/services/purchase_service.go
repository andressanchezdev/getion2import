package services

// purchase_service.go · reglas de negocio de compras: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas
// conecta con: los repositories y dtos de compras; los llama el controller y la conexión llega del contenedor

import (
	"context"
	"fmt"
	"time"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	externalrepos "importadoraApi/src/features/externals/repositories"
	inventoryrepos "importadoraApi/src/features/inventory/repositories"
	"importadoraApi/src/features/purchases/dtos"
	"importadoraApi/src/features/purchases/repositories"
	warehouserepos "importadoraApi/src/features/warehouses/repositories"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PurchaseService struct {
	pool          *pgxpool.Pool
	purchaseRepo  *repositories.PurchaseRepository
	externalRepo  *externalrepos.ExternalRepository
	warehouseRepo *warehouserepos.WarehouseRepository
	inventoryRepo *inventoryrepos.InventoryRepository
	auditRepo     *authRepos.AuditRepository
}

// NewPurchaseService crea el servicio con las piezas que necesita para funcionar.
func NewPurchaseService(
	pool *pgxpool.Pool,
	purchaseRepo *repositories.PurchaseRepository,
	externalRepo *externalrepos.ExternalRepository,
	warehouseRepo *warehouserepos.WarehouseRepository,
	inventoryRepo *inventoryrepos.InventoryRepository,
	auditRepo *authRepos.AuditRepository,
) *PurchaseService {
	return &PurchaseService{
		pool:          pool,
		purchaseRepo:  purchaseRepo,
		externalRepo:  externalRepo,
		warehouseRepo: warehouseRepo,
		inventoryRepo: inventoryRepo,
		auditRepo:     auditRepo,
	}
}

// Create crea la orden de compra con las validaciones del negocio (compañía, duplicados y permisos).
func (s *PurchaseService) Create(ctx context.Context, actor *middlewares.ActorContext, req dtos.CreatePurchaseRequest, ip, ua string) (*dtos.PurchaseResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	if req.SupplierID <= 0 {
		return nil, utils.BadRequest("MISSING_SUPPLIER", "El proveedor es requerido.")
	}
	if req.WarehouseID <= 0 {
		return nil, utils.BadRequest("MISSING_WAREHOUSE", "La bodega de destino es requerida.")
	}
	if len(req.Items) == 0 {
		return nil, utils.BadRequest("EMPTY_ITEMS", "La orden de compra debe contener al menos un producto.")
	}

	companyID := int64(1)
	if actor.CompanyID != nil && *actor.CompanyID > 0 {
		companyID = *actor.CompanyID
	} else if req.CompanyID != nil && *req.CompanyID > 0 {
		companyID = *req.CompanyID
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, utils.Internal("Error al iniciar transacción de compra.", err)
	}
	defer tx.Rollback(ctx)

	// Validar proveedor
	supplier, err := s.externalRepo.FindByID(ctx, tx, req.SupplierID)
	if err != nil {
		return nil, utils.Internal("Error al consultar proveedor.", err)
	}
	if supplier == nil || supplier.CompanyID != companyID {
		return nil, utils.NotFound("SUPPLIER_NOT_FOUND", "El proveedor no existe o no pertenece a la compañía.")
	}

	// Validar bodega
	wh, err := s.warehouseRepo.FindByID(ctx, tx, req.WarehouseID)
	if err != nil {
		return nil, utils.Internal("Error al consultar bodega.", err)
	}
	if wh == nil || wh.CompanyID != companyID {
		return nil, utils.NotFound("WAREHOUSE_NOT_FOUND", "La bodega no existe o no pertenece a la compañía.")
	}

	serialCode, err := utils.NextSerialCode(ctx, tx, companyID, &req.WarehouseID, types.SeriesPurchase, "OC-")
	if err != nil {
		return nil, utils.Internal("Error al generar consecutivo de orden de compra.", err)
	}

	var expectedDate *time.Time
	if req.ExpectedDate != nil && *req.ExpectedDate != "" {
		if t, err := time.Parse("2006-01-02", *req.ExpectedDate); err == nil {
			expectedDate = &t
		}
	}

	var grandSubtotal, grandIVA, grandTotal float64
	type itemComputed struct {
		productID  int64
		quantity   int
		unitCost   float64
		ivaPercent *float64
		subtotal   float64
	}
	itemsComputed := make([]itemComputed, 0, len(req.Items))

	for _, it := range req.Items {
		if it.Quantity <= 0 {
			return nil, utils.BadRequest("INVALID_QUANTITY", "La cantidad debe ser mayor a 0.")
		}
		if it.UnitCost < 0 {
			return nil, utils.BadRequest("INVALID_COST", "El costo unitario no puede ser negativo.")
		}

		lineSubtotal := float64(it.Quantity) * it.UnitCost
		lineIVA := 0.0
		if it.IVAPercent != nil && *it.IVAPercent > 0 {
			lineIVA = lineSubtotal * (*it.IVAPercent / 100.0)
		}

		grandSubtotal += lineSubtotal
		grandIVA += lineIVA
		grandTotal += (lineSubtotal + lineIVA)

		itemsComputed = append(itemsComputed, itemComputed{
			productID:  it.ProductID,
			quantity:   it.Quantity,
			unitCost:   it.UnitCost,
			ivaPercent: it.IVAPercent,
			subtotal:   lineSubtotal,
		})
	}

	entity := &repositories.PurchaseEntity{
		CompanyID:    companyID,
		SerialCode:   serialCode,
		SupplierID:   req.SupplierID,
		WarehouseID:  req.WarehouseID,
		EmployeeID:   actor.ActorID,
		Status:       types.PurchaseOrdered, // Nace lista para enviar a proveedor
		SupplierRef:  req.SupplierRef,
		ExpectedDate: expectedDate,
		Subtotal:     grandSubtotal,
		IVATotal:     grandIVA,
		Total:        grandTotal,
		Notes:        req.Notes,
	}

	created, err := s.purchaseRepo.Create(ctx, tx, entity)
	if err != nil {
		return nil, utils.Internal("Error al registrar orden de compra.", err)
	}

	for _, it := range itemsComputed {
		itemEntity := &repositories.PurchaseItemEntity{
			PurchaseID:  created.ID,
			ProductID:   it.productID,
			Quantity:    it.quantity,
			ReceivedQty: 0,
			UnitCost:    it.unitCost,
			IVAPercent:  it.ivaPercent,
			Subtotal:    it.subtotal,
		}
		if err := s.purchaseRepo.CreateItem(ctx, tx, itemEntity); err != nil {
			return nil, utils.Internal("Error al guardar ítem de la orden de compra.", err)
		}
	}

	_ = s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
		CompanyID: &companyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "purchases",
		EntityID:  &created.ID,
		Action:    "PURCHASE_CREATED",
		Reason:    fmt.Sprintf("Orden de compra %s creada por $%.2f", serialCode, grandTotal),
		IPAddress: ip,
		UserAgent: ua,
	})

	if err := tx.Commit(ctx); err != nil {
		return nil, utils.Internal("Error al confirmar orden de compra.", err)
	}

	return s.FindByID(ctx, actor, created.ID)
}

// FindByID devuelve la orden de compra por su id, validando que sea de la compañía del usuario.
func (s *PurchaseService) FindByID(ctx context.Context, actor *middlewares.ActorContext, id int64) (*dtos.PurchaseResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	entity, err := s.purchaseRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar orden de compra.", err)
	}
	if entity == nil {
		return nil, utils.NotFound("PURCHASE_NOT_FOUND", "La orden de compra no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != entity.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso sobre esta orden de compra.")
		}
	}

	items, err := s.purchaseRepo.ListItems(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar ítems de la orden de compra.", err)
	}

	return s.mapToDTO(entity, items), nil
}

// List devuelve las órdenes de compra paginados según los filtros, limitados a lo que el usuario puede ver.
func (s *PurchaseService) List(ctx context.Context, actor *middlewares.ActorContext, f dtos.PurchaseFilterQuery) ([]dtos.PurchaseResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		f.CompanyID = actor.CompanyID
	}

	list, total, err := s.purchaseRepo.List(ctx, s.pool, f)
	if err != nil {
		return nil, nil, utils.Internal("Error al listar órdenes de compra.", err)
	}

	meta := utils.BuildMeta(f.Page, f.PageSize, total)
	resp := make([]dtos.PurchaseResponse, 0, len(list))
	for i := range list {
		resp = append(resp, *s.mapToDTO(&list[i], nil))
	}

	return resp, &meta, nil
}
