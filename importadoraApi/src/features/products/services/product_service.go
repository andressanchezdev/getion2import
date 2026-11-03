package services

// product_service.go · reglas de negocio de productos: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas
// conecta con: los repositories y dtos de productos; los llama el controller y la conexión llega del contenedor

import (
	"context"
	recycleBinRepos "importadoraApi/src/features/recyclebin/repositories"
	"strings"

	"importadoraApi/src/core/config"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	catalogRepos "importadoraApi/src/features/catalog/repositories"
	inventoryRepos "importadoraApi/src/features/inventory/repositories"
	"importadoraApi/src/features/products/dtos"
	"importadoraApi/src/features/products/repositories"
	warehouseRepos "importadoraApi/src/features/warehouses/repositories"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ProductService struct {
	cfg            *config.Config
	pool           *pgxpool.Pool
	productRepo    *repositories.ProductRepository
	recycleBinRepo *recycleBinRepos.RecycleBinRepository
	categoryRepo   *catalogRepos.CategoryRepository
	brandRepo      *catalogRepos.BrandRepository
	modelRepo      *catalogRepos.ModelRepository
	auditRepo      *authRepos.AuditRepository
	warehouseRepo  *warehouseRepos.WarehouseRepository
	inventoryRepo  *inventoryRepos.InventoryRepository
}

// NewProductService crea el servicio con las piezas que necesita para funcionar.
func NewProductService(
	cfg *config.Config,
	pool *pgxpool.Pool,
	productRepo *repositories.ProductRepository,
	recycleBinRepo *recycleBinRepos.RecycleBinRepository,
	categoryRepo *catalogRepos.CategoryRepository,
	brandRepo *catalogRepos.BrandRepository,
	modelRepo *catalogRepos.ModelRepository,
	auditRepo *authRepos.AuditRepository,
	warehouseRepo *warehouseRepos.WarehouseRepository,
	inventoryRepo *inventoryRepos.InventoryRepository,
) *ProductService {
	return &ProductService{
		cfg:            cfg,
		pool:           pool,
		productRepo:    productRepo,
		recycleBinRepo: recycleBinRepo,
		categoryRepo:   categoryRepo,
		brandRepo:      brandRepo,
		modelRepo:      modelRepo,
		auditRepo:      auditRepo,
		warehouseRepo:  warehouseRepo,
		inventoryRepo:  inventoryRepo,
	}
}

// List obtiene el listado paginado de productos.
func (s *ProductService) List(ctx context.Context, actor *middlewares.ActorContext, filter dtos.ProductFilterQuery) ([]dtos.ProductResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		filter.CompanyID = actor.CompanyID
	}

	entities, total, err := s.productRepo.List(ctx, s.pool, filter)
	if err != nil {
		return nil, nil, utils.Internal("Error al listar productos.", err)
	}

	meta := utils.BuildMeta(filter.Page, filter.PageSize, total)
	result := make([]dtos.ProductResponse, 0, len(entities))
	for i := range entities {
		result = append(result, *s.mapProductToDTO(&entities[i], nil, nil))
	}

	return result, &meta, nil
}

// Search busca productos mediante el campo easysearch indexado con GIN trigram.
func (s *ProductService) Search(ctx context.Context, actor *middlewares.ActorContext, query string, params utils.PageParams) ([]dtos.ProductResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	var companyID *int64
	if actor.ActorType != types.ActorSuperadmin {
		companyID = actor.CompanyID
	}

	filter := dtos.ProductFilterQuery{
		CompanyID: companyID,
		Search:    strings.TrimSpace(query),
		Page:      params.Page,
		PageSize:  params.PageSize,
	}

	return s.List(ctx, actor, filter)
}

// GetByID obtiene el detalle completo del producto con sus códigos y proveedores adjuntos.
func (s *ProductService) GetByID(ctx context.Context, actor *middlewares.ActorContext, id int64) (*dtos.ProductResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	entity, err := s.productRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar producto.", err)
	}
	if entity == nil {
		return nil, utils.NotFound("PRODUCT_NOT_FOUND", "El producto solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != entity.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para consultar este producto.")
		}
	}

	codes, _ := s.productRepo.ListCodes(ctx, s.pool, id)
	suppliers, _ := s.productRepo.ListSuppliers(ctx, s.pool, id)

	return s.mapProductToDTO(entity, codes, suppliers), nil
}
