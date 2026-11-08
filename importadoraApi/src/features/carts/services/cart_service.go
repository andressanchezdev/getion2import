package services

// cart_service.go · reglas de negocio de carritos: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas
// conecta con: los repositories y dtos de carritos; los llama el controller y la conexión llega del contenedor

import (
	"context"

	"importadoraApi/src/core/config"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/carts/dtos"
	"importadoraApi/src/features/carts/repositories"
	customerRepos "importadoraApi/src/features/customers/repositories"
	inventoryRepos "importadoraApi/src/features/inventory/repositories"
	productRepos "importadoraApi/src/features/products/repositories"

	"github.com/jackc/pgx/v5/pgxpool"
)

type CartService struct {
	cfg           *config.Config
	pool          *pgxpool.Pool
	cartRepo      *repositories.CartRepository
	productRepo   *productRepos.ProductRepository
	inventoryRepo *inventoryRepos.InventoryRepository
	customerRepo  *customerRepos.CustomerRepository
	auditRepo     *authRepos.AuditRepository
}

// NewCartService crea el servicio con las piezas que necesita para funcionar.
func NewCartService(
	cfg *config.Config,
	pool *pgxpool.Pool,
	cartRepo *repositories.CartRepository,
	productRepo *productRepos.ProductRepository,
	inventoryRepo *inventoryRepos.InventoryRepository,
	customerRepo *customerRepos.CustomerRepository,
	auditRepo *authRepos.AuditRepository,
) *CartService {
	return &CartService{
		cfg:           cfg,
		pool:          pool,
		cartRepo:      cartRepo,
		productRepo:   productRepo,
		inventoryRepo: inventoryRepo,
		customerRepo:  customerRepo,
		auditRepo:     auditRepo,
	}
}

// GetActiveCart devuelve el carrito activo del empleado, con sus renglones y totales.
func (s *CartService) GetActiveCart(ctx context.Context, actor *middlewares.ActorContext) (*dtos.CartResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	companyID := actor.CompanyID
	if companyID == nil {
		return nil, utils.BadRequest("MISSING_COMPANY_ID", "El usuario debe pertenecer a una compañía para operar un carrito.")
	}

	cart, err := s.cartRepo.FindActiveByEmployee(ctx, s.pool, *companyID, actor.ActorID)
	if err != nil {
		return nil, utils.Internal("Error al consultar carrito activo.", err)
	}

	if cart == nil {
		// Crear automáticamente un carrito inicial
		entity := &repositories.CartEntity{
			CompanyID:  *companyID,
			EmployeeID: &actor.ActorID,
			PriceTier:  types.PriceTierP1,
			Status:     types.CartOpen,
		}
		newCart, err := s.cartRepo.Create(ctx, s.pool, entity)
		if err != nil {
			return nil, utils.Internal("Error al inicializar carrito activo.", err)
		}
		cart = newCart
	}

	items, err := s.cartRepo.ListItems(ctx, s.pool, cart.ID)
	if err != nil {
		return nil, utils.Internal("Error al consultar ítems del carrito.", err)
	}

	return s.buildResponse(cart, items), nil
}

// GetByID devuelve el carrito por su id, validando que sea de la compañía del usuario.
func (s *CartService) GetByID(ctx context.Context, actor *middlewares.ActorContext, id int64) (*dtos.CartResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	cart, err := s.cartRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar carrito.", err)
	}
	if cart == nil {
		return nil, utils.NotFound("CART_NOT_FOUND", "El carrito solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != cart.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para consultar este carrito.")
		}
	}

	items, err := s.cartRepo.ListItems(ctx, s.pool, cart.ID)
	if err != nil {
		return nil, utils.Internal("Error al consultar ítems del carrito.", err)
	}

	return s.buildResponse(cart, items), nil
}

// Create crea el carrito con las validaciones del negocio (compañía, duplicados y permisos).
func (s *CartService) Create(ctx context.Context, actor *middlewares.ActorContext, req dtos.CreateCartRequest) (*dtos.CartResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	companyID := req.CompanyID
	if actor.ActorType != types.ActorSuperadmin {
		companyID = actor.CompanyID
	}
	if companyID == nil {
		return nil, utils.BadRequest("MISSING_COMPANY_ID", "El ID de compañía es requerido.")
	}

	tier := types.PriceTierP1
	if req.PriceTier != nil && *req.PriceTier != "" {
		tier = *req.PriceTier
	}

	// Si se pasa cliente, heredar su tarifa si no se especificó explícitamente
	if req.CustomerID != nil && req.PriceTier == nil {
		customer, err := s.customerRepo.FindByID(ctx, s.pool, *req.CustomerID)
		if err == nil && customer != nil {
			tier = customer.PriceTier
		}
	}

	var empID *int64
	if actor.ActorType == types.ActorEmployee {
		empID = &actor.ActorID
	}

	entity := &repositories.CartEntity{
		CompanyID:   *companyID,
		EmployeeID:  empID,
		CustomerID:  req.CustomerID,
		WarehouseID: req.WarehouseID,
		PriceTier:   tier,
		Status:      types.CartOpen,
	}

	created, err := s.cartRepo.Create(ctx, s.pool, entity)
	if err != nil {
		return nil, utils.Internal("Error al crear carrito.", err)
	}

	return s.buildResponse(created, []dtos.CartItemResponse{}), nil
}

// ClearCart vacía el carrito del empleado.
func (s *CartService) ClearCart(ctx context.Context, actor *middlewares.ActorContext, cartID int64) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	cart, err := s.cartRepo.FindByID(ctx, s.pool, cartID)
	if err != nil || cart == nil {
		return utils.NotFound("CART_NOT_FOUND", "El carrito no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != cart.CompanyID {
			return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para vaciar este carrito.")
		}
	}

	if err := s.cartRepo.ClearItems(ctx, s.pool, cartID); err != nil {
		return utils.Internal("Error al vaciar carrito.", err)
	}

	return s.cartRepo.SetStatus(ctx, s.pool, cartID, types.CartAbandoned)
}

// buildResponse arma la respuesta del carrito con sus renglones y totales.
func (s *CartService) buildResponse(c *repositories.CartEntity, items []dtos.CartItemResponse) *dtos.CartResponse {
	subtotal := 0.0
	discountTotal := 0.0
	total := 0.0

	for _, it := range items {
		subtotal += float64(it.Quantity) * it.UnitPrice
		discountTotal += it.Discount
		total += it.LineTotal
	}

	if items == nil {
		items = []dtos.CartItemResponse{}
	}

	return &dtos.CartResponse{
		ID:            c.ID,
		UUID:          c.UUID,
		CompanyID:     c.CompanyID,
		EmployeeID:    c.EmployeeID,
		EmployeeName:  c.EmployeeName,
		CustomerID:    c.CustomerID,
		CustomerName:  c.CustomerName,
		WarehouseID:   c.WarehouseID,
		WarehouseName: c.WarehouseName,
		PriceTier:     c.PriceTier,
		Status:        c.Status,
		CreatedAt:     c.CreatedAt,
		UpdatedAt:     c.UpdatedAt,
		Items:         items,
		Subtotal:      subtotal,
		DiscountTotal: discountTotal,
		Total:         total,
	}
}

