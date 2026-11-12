package services

// cart_service.go · reglas de negocio de carritos: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas
// conecta con: los repositories y dtos de carritos; los llama el controller y la conexión llega del contenedor

import (
	"context"

	"importadoraApi/src/core/config"
	"importadoraApi/src/core/db"
	"importadoraApi/src/core/events"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/carts/dtos"
	"importadoraApi/src/features/carts/repositories"
	customerRepos "importadoraApi/src/features/customers/repositories"
	inventoryRepos "importadoraApi/src/features/inventory/repositories"
	productRepos "importadoraApi/src/features/products/repositories"

	"github.com/jackc/pgx/v5"
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
	events        *events.Recorder
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
	eventsRecorder ...*events.Recorder,
) *CartService {
	var rec *events.Recorder
	if len(eventsRecorder) > 0 {
		rec = eventsRecorder[0]
	}
	return &CartService{
		cfg:           cfg,
		pool:          pool,
		cartRepo:      cartRepo,
		productRepo:   productRepo,
		inventoryRepo: inventoryRepo,
		customerRepo:  customerRepo,
		auditRepo:     auditRepo,
		events:        rec,
	}
}

// resolveEmployeeID obtiene el id de empleado correspondiente al actor (su propio id si es empleado, o el ligado si es administrador)
func (s *CartService) resolveEmployeeID(ctx context.Context, actor *middlewares.ActorContext) (int64, error) {
	if actor == nil {
		return 0, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	switch actor.ActorType {
	case types.ActorEmployee:
		return actor.ActorID, nil
	case types.ActorAdmin:
		var empID int64
		err := s.pool.QueryRow(ctx, `SELECT COALESCE(employee_id, 0) FROM admins WHERE id = $1`, actor.ActorID).Scan(&empID)
		if err != nil {
			return 0, utils.Internal("Error al resolver empleado del administrador.", err)
		}
		if empID <= 0 {
			return 0, utils.BadRequest("ACTOR_WITHOUT_EMPLOYEE", "Tu cuenta de administrador no está ligada a un empleado, por eso no puede operar un carrito. Pide que la liguen a un empleado de la compañía.")
		}
		return empID, nil
	default:
		return 0, utils.Forbidden("FORBIDDEN", "Solo administradores y empleados con compañía pueden operar carritos.")
	}
}

// assertCartOwnership valida que el actor pertenezca a la misma compañía y sea el dueño del carrito
func (s *CartService) assertCartOwnership(ctx context.Context, actor *middlewares.ActorContext, cart *repositories.CartEntity) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	if actor.ActorType == types.ActorSuperadmin {
		return nil
	}
	if actor.CompanyID == nil || *actor.CompanyID != cart.CompanyID {
		return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para acceder a este carrito.")
	}
	empID, err := s.resolveEmployeeID(ctx, actor)
	if err != nil {
		return err
	}
	if cart.EmployeeID == nil || *cart.EmployeeID != empID {
		return utils.Forbidden("FORBIDDEN_CART_ACCESS", "No tienes permiso para acceder al carrito de otro usuario.")
	}
	return nil
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

	empID, err := s.resolveEmployeeID(ctx, actor)
	if err != nil {
		return nil, err
	}

	cart, err := s.cartRepo.FindActiveByEmployee(ctx, s.pool, *companyID, empID)
	if err != nil {
		return nil, utils.Internal("Error al consultar carrito activo.", err)
	}

	if cart == nil {
		// Crear automáticamente un carrito inicial
		entity := &repositories.CartEntity{
			CompanyID:  *companyID,
			EmployeeID: &empID,
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

// GetByID devuelve el carrito por su id, validando que pertenezca al usuario.
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

	if err := s.assertCartOwnership(ctx, actor, cart); err != nil {
		return nil, err
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

	empID, err := s.resolveEmployeeID(ctx, actor)
	if err != nil {
		return nil, err
	}

	// Si el empleado ya tiene un carrito abierto en la compañía, reutilizarlo para evitar carritos duplicados
	existing, err := s.cartRepo.FindActiveByEmployee(ctx, s.pool, *companyID, empID)
	if err == nil && existing != nil {
		items, err := s.cartRepo.ListItems(ctx, s.pool, existing.ID)
		if err == nil {
			return s.buildResponse(existing, items), nil
		}
	}

	entity := &repositories.CartEntity{
		CompanyID:   *companyID,
		EmployeeID:  &empID,
		CustomerID:  req.CustomerID,
		WarehouseID: req.WarehouseID,
		PriceTier:   tier,
		Status:      types.CartOpen,
	}

	var resp *dtos.CartResponse
	err = db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		created, err := s.cartRepo.Create(ctx, tx, entity)
		if err != nil {
			return utils.Internal("Error al crear carrito.", err)
		}
		resp = s.buildResponse(created, []dtos.CartItemResponse{})
		if s.events != nil {
			s.events.Record(ctx, events.NewPersonal(events.CartUpdated, &created.CompanyID, string(actor.ActorType), actor.ActorID, events.CartUpdatedData{Cart: resp}))
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return resp, nil
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

	if err := s.assertCartOwnership(ctx, actor, cart); err != nil {
		return err
	}

	return db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		if err := s.cartRepo.ClearItems(ctx, tx, cartID); err != nil {
			return utils.Internal("Error al vaciar carrito.", err)
		}
		if err := s.cartRepo.Touch(ctx, tx, cartID); err != nil {
			return err
		}
		if s.events != nil {
			updatedCart, err := s.cartRepo.FindByID(ctx, tx, cartID)
			if err != nil || updatedCart == nil {
				updatedCart = cart
			}
			resp := s.buildResponse(updatedCart, []dtos.CartItemResponse{})
			s.events.Record(ctx, events.NewPersonal(events.CartUpdated, &updatedCart.CompanyID, string(actor.ActorType), actor.ActorID, events.CartUpdatedData{Cart: resp}))
		}
		return nil
	})
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

