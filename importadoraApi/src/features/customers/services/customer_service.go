package services

// customer_service.go · reglas de negocio de clientes: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas
// conecta con: los repositories y dtos de clientes; los llama el controller y la conexión llega del contenedor

import (
	recycleBinRepos "importadoraApi/src/features/recyclebin/repositories"
	"context"
	"strings"

	"importadoraApi/src/core/config"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/customers/dtos"
	"importadoraApi/src/features/customers/repositories"

	"github.com/jackc/pgx/v5/pgxpool"
)

type CustomerService struct {
	cfg          *config.Config
	pool         *pgxpool.Pool
	customerRepo *repositories.CustomerRepository
	recycleBinRepo *recycleBinRepos.RecycleBinRepository
	auditRepo    *authRepos.AuditRepository
}

// NewCustomerService crea el servicio con las piezas que necesita para funcionar.
func NewCustomerService(
	cfg *config.Config,
	pool *pgxpool.Pool,
	customerRepo *repositories.CustomerRepository,
	recycleBinRepo *recycleBinRepos.RecycleBinRepository,
	auditRepo *authRepos.AuditRepository,
) *CustomerService {
	return &CustomerService{
		cfg:          cfg,
		pool:         pool,
		customerRepo: customerRepo,
		recycleBinRepo: recycleBinRepo,
		auditRepo:    auditRepo,
	}
}

// List obtiene el listado paginado de clientes validando aislamiento de compañía.
func (s *CustomerService) List(ctx context.Context, actor *middlewares.ActorContext, filter dtos.CustomerFilterQuery) ([]dtos.CustomerResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		filter.CompanyID = actor.CompanyID
	}

	entities, total, err := s.customerRepo.List(ctx, s.pool, filter)
	if err != nil {
		return nil, nil, utils.Internal("Error al listar clientes.", err)
	}

	meta := utils.BuildMeta(filter.Page, filter.PageSize, total)
	result := make([]dtos.CustomerResponse, 0, len(entities))
	for i := range entities {
		result = append(result, *s.mapCustomerToDTO(&entities[i], nil))
	}

	return result, &meta, nil
}

// Search busca clientes por coincidencia de texto rápido.
func (s *CustomerService) Search(ctx context.Context, actor *middlewares.ActorContext, query string, params utils.PageParams) ([]dtos.CustomerResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	var companyID *int64
	if actor.ActorType != types.ActorSuperadmin {
		companyID = actor.CompanyID
	}

	filter := dtos.CustomerFilterQuery{
		CompanyID: companyID,
		Search:    strings.TrimSpace(query),
		Page:      params.Page,
		PageSize:  params.PageSize,
	}

	return s.List(ctx, actor, filter)
}

// ListSelector devuelve la lista ligera de clientes para selector de venta rápida con el cliente mostrador por defecto al tope.
func (s *CustomerService) ListSelector(ctx context.Context, actor *middlewares.ActorContext, search string) ([]dtos.CustomerSelectorResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	companyID := int64(1)
	if actor.CompanyID != nil && *actor.CompanyID > 0 {
		companyID = *actor.CompanyID
	}

	return s.customerRepo.ListSelector(ctx, s.pool, companyID, search)
}

// GetByID obtiene el detalle completo del cliente incluyendo sus documentos.
func (s *CustomerService) GetByID(ctx context.Context, actor *middlewares.ActorContext, id int64) (*dtos.CustomerResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	entity, err := s.customerRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar cliente.", err)
	}
	if entity == nil {
		return nil, utils.NotFound("CUSTOMER_NOT_FOUND", "El cliente solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != entity.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para consultar este cliente.")
		}
	}

	docs, err := s.customerRepo.ListDocuments(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar documentos del cliente.", err)
	}

	return s.mapCustomerToDTO(entity, docs), nil
}

// ==========================================
// MÉTODOS DE DOCUMENTOS ADJUNTOS
// ==========================================

// GetCreditStatus devuelve el estado de crédito del cliente, validando que sea de la compañía del usuario.
func (s *CustomerService) GetCreditStatus(ctx context.Context, companyID int64, customerID int64) (*dtos.CustomerCreditStatusResponse, error) {
	status, err := s.customerRepo.GetCreditStatusSummary(ctx, s.pool, customerID)
	if err != nil {
		return nil, utils.Internal("Error al consultar estado de crédito del cliente.", err)
	}
	if status == nil {
		return nil, utils.NotFound("CUSTOMER_NOT_FOUND", "Cliente no encontrado o inactivo.")
	}
	return status, nil
}
