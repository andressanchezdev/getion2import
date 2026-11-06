package services

// warehouse_service.go · reglas de negocio de bodegas: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas
// conecta con: los repositories y dtos de bodegas; los llama el controller y la conexión llega del contenedor

import (
	"context"
	"strings"

	"importadoraApi/src/core/config"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/warehouses/dtos"
	"importadoraApi/src/features/warehouses/repositories"

	"github.com/jackc/pgx/v5/pgxpool"
)

type WarehouseService struct {
	cfg           *config.Config
	pool          *pgxpool.Pool
	warehouseRepo *repositories.WarehouseRepository
	auditRepo     *authRepos.AuditRepository
	authRepo      *authRepos.AuthRepository
}

// NewWarehouseService crea el servicio con las piezas que necesita para funcionar.
func NewWarehouseService(
	cfg *config.Config,
	pool *pgxpool.Pool,
	warehouseRepo *repositories.WarehouseRepository,
	auditRepo *authRepos.AuditRepository,
	authRepo *authRepos.AuthRepository,
) *WarehouseService {
	return &WarehouseService{
		cfg:           cfg,
		pool:          pool,
		warehouseRepo: warehouseRepo,
		auditRepo:     auditRepo,
		authRepo:      authRepo,
	}
}

// GetByID recupera la bodega con su configuración fiscal incrustada.
func (s *WarehouseService) GetByID(ctx context.Context, actor *middlewares.ActorContext, id int64) (*dtos.WarehouseResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	entity, err := s.warehouseRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar la bodega.", err)
	}
	if entity == nil {
		return nil, utils.NotFound("WAREHOUSE_NOT_FOUND", "La bodega solicitada no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != entity.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_WAREHOUSE_ACCESS", "No tienes permiso para consultar esta bodega.")
		}
	}

	fact, _ := s.warehouseRepo.FindFacturationByWarehouseID(ctx, s.pool, id)
	return s.mapToDTO(entity, fact), nil
}

// List lista bodegas con paginación respetando aislamiento multi-tenant.
func (s *WarehouseService) List(ctx context.Context, actor *middlewares.ActorContext, companyID int64, params utils.PageParams) ([]dtos.WarehouseResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	if companyID <= 0 {
		effective, err := middlewares.EffectiveCompanyIDFromContext(actor)
		if err == nil {
			companyID = effective
		}
	}

	entities, total, err := s.warehouseRepo.List(ctx, s.pool, companyID, params)
	if err != nil {
		return nil, nil, utils.Internal("Error al listar bodegas.", err)
	}

	meta := utils.BuildMeta(params.Page, params.PageSize, total)
	result := make([]dtos.WarehouseResponse, 0, len(entities))
	for i := range entities {
		result = append(result, *s.mapToDTO(&entities[i], nil))
	}

	return result, &meta, nil
}

// Search busca bodegas por coincidencia de texto en código, nombre, ciudad o teléfono.
func (s *WarehouseService) Search(ctx context.Context, actor *middlewares.ActorContext, companyID int64, query string, params utils.PageParams) ([]dtos.WarehouseResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	cleanQ := strings.TrimSpace(query)
	if cleanQ == "" {
		return s.List(ctx, actor, companyID, params)
	}

	companyID, err := middlewares.EffectiveCompanyIDFromContext(actor)
	if err != nil {
		return nil, nil, err
	}

	entities, total, err := s.warehouseRepo.Search(ctx, s.pool, companyID, cleanQ, params)
	if err != nil {
		return nil, nil, utils.Internal("Error al buscar bodegas.", err)
	}

	meta := utils.BuildMeta(params.Page, params.PageSize, total)
	result := make([]dtos.WarehouseResponse, 0, len(entities))
	for i := range entities {
		result = append(result, *s.mapToDTO(&entities[i], nil))
	}

	return result, &meta, nil
}

// ==========================================
// SERVICIOS PARA UBICACIONES DE BODEGA
// ==========================================
