package services

import (
	"context"
	"strings"

	"importadoraApi/src/core/config"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/externals/dtos"
	"importadoraApi/src/features/externals/repositories"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ExternalService struct {
	cfg          *config.Config
	pool         *pgxpool.Pool
	externalRepo *repositories.ExternalRepository
	auditRepo    *authRepos.AuditRepository
}

func NewExternalService(
	cfg *config.Config,
	pool *pgxpool.Pool,
	externalRepo *repositories.ExternalRepository,
	auditRepo *authRepos.AuditRepository,
) *ExternalService {
	return &ExternalService{
		cfg:          cfg,
		pool:         pool,
		externalRepo: externalRepo,
		auditRepo:    auditRepo,
	}
}

func (s *ExternalService) List(ctx context.Context, actor *middlewares.ActorContext, filter dtos.ExternalFilterQuery) ([]dtos.ExternalResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		filter.CompanyID = actor.CompanyID
	}

	entities, total, err := s.externalRepo.List(ctx, s.pool, filter)
	if err != nil {
		return nil, nil, utils.Internal("Error al listar externos.", err)
	}

	meta := utils.BuildMeta(filter.Page, filter.PageSize, total)
	result := make([]dtos.ExternalResponse, 0, len(entities))
	for i := range entities {
		result = append(result, *s.mapExternalToDTO(&entities[i]))
	}

	return result, &meta, nil
}

func (s *ExternalService) Search(ctx context.Context, actor *middlewares.ActorContext, query string, params utils.PageParams) ([]dtos.ExternalResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	var companyID *int64
	if actor.ActorType != types.ActorSuperadmin {
		companyID = actor.CompanyID
	}

	filter := dtos.ExternalFilterQuery{
		CompanyID: companyID,
		Search:    strings.TrimSpace(query),
		Page:      params.Page,
		PageSize:  params.PageSize,
	}

	return s.List(ctx, actor, filter)
}

func (s *ExternalService) GetByID(ctx context.Context, actor *middlewares.ActorContext, id int64) (*dtos.ExternalResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	entity, err := s.externalRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar externo.", err)
	}
	if entity == nil {
		return nil, utils.NotFound("EXTERNAL_NOT_FOUND", "El registro externo solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != entity.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para consultar este registro externo.")
		}
	}

	return s.mapExternalToDTO(entity), nil
}

func (s *ExternalService) Create(ctx context.Context, actor *middlewares.ActorContext, req dtos.CreateExternalRequest, ip, ua string) (*dtos.ExternalResponse, error) {
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

	nameClean := strings.TrimSpace(req.Name)
	if nameClean == "" {
		return nil, utils.BadRequest("INVALID_NAME", "El nombre es obligatorio.")
	}

	if req.Kind == "" {
		req.Kind = types.ExternalSupplier
	}

	// Verificar unicidad (company_id, kind, name)
	existing, err := s.externalRepo.FindByCompanyKindAndName(ctx, s.pool, *companyID, req.Kind, nameClean)
	if err != nil {
		return nil, utils.Internal("Error al verificar nombre del externo.", err)
	}
	if existing != nil {
		return nil, utils.Conflict("EXTERNAL_EXISTS", "Ya existe un registro con este nombre y tipo en la empresa.")
	}

	docType := req.DocumentType
	if docType == "" {
		docType = types.DocNIT
	}

	terms := int16(0)
	if req.TermsDays != nil {
		terms = *req.TermsDays
	}

	creditLimit := 0.0
	if req.CreditLimit != nil {
		creditLimit = *req.CreditLimit
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	entity := &repositories.ExternalEntity{
		CompanyID:    *companyID,
		Kind:         req.Kind,
		Category:     req.Category,
		DocumentType: docType,
		Document:     req.Document,
		Name:         nameClean,
		ContactName:  req.ContactName,
		ContactPhone: req.ContactPhone,
		ContactEmail: req.ContactEmail,
		Phone:        req.Phone,
		Email:        req.Email,
		Address:      req.Address,
		City:         req.City,
		TermsDays:    terms,
		CreditLimit:  creditLimit,
		Coverage:     req.Coverage,
		IsActive:     isActive,
	}

	created, err := s.externalRepo.Create(ctx, s.pool, entity)
	if err != nil {
		return nil, utils.Internal("Error al registrar externo.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: companyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "externals",
		EntityID:  &created.ID,
		Action:    "EXTERNAL_CREATED",
		Reason:    "Creación de entidad externa (" + string(created.Kind) + ")",
		IPAddress: ip,
		UserAgent: ua,
	})

	return s.mapExternalToDTO(created), nil
}

func (s *ExternalService) Update(ctx context.Context, actor *middlewares.ActorContext, id int64, req dtos.UpdateExternalRequest, ip, ua string) (*dtos.ExternalResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.externalRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar externo.", err)
	}
	if current == nil {
		return nil, utils.NotFound("EXTERNAL_NOT_FOUND", "El registro externo solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para modificar este registro externo.")
		}
	}

	if req.Kind != nil {
		current.Kind = *req.Kind
	}
	if req.Category != nil {
		current.Category = req.Category
	}
	if req.DocumentType != nil {
		current.DocumentType = *req.DocumentType
	}
	if req.Document != nil {
		current.Document = req.Document
	}
	if req.Name != nil && strings.TrimSpace(*req.Name) != "" {
		cleanName := strings.TrimSpace(*req.Name)
		if cleanName != current.Name {
			existing, err := s.externalRepo.FindByCompanyKindAndName(ctx, s.pool, current.CompanyID, current.Kind, cleanName)
			if err != nil {
				return nil, utils.Internal("Error al verificar nombre del externo.", err)
			}
			if existing != nil && existing.ID != current.ID {
				return nil, utils.Conflict("EXTERNAL_EXISTS", "Ya existe otro registro con ese nombre y tipo en la empresa.")
			}
			current.Name = cleanName
		}
	}
	if req.ContactName != nil {
		current.ContactName = req.ContactName
	}
	if req.ContactPhone != nil {
		current.ContactPhone = req.ContactPhone
	}
	if req.ContactEmail != nil {
		current.ContactEmail = req.ContactEmail
	}
	if req.Phone != nil {
		current.Phone = req.Phone
	}
	if req.Email != nil {
		current.Email = req.Email
	}
	if req.Address != nil {
		current.Address = req.Address
	}
	if req.City != nil {
		current.City = req.City
	}
	if req.TermsDays != nil {
		current.TermsDays = *req.TermsDays
	}
	if req.CreditLimit != nil {
		current.CreditLimit = *req.CreditLimit
	}
	if req.Coverage != nil {
		current.Coverage = req.Coverage
	}
	if req.IsActive != nil {
		current.IsActive = *req.IsActive
	}

	updated, err := s.externalRepo.Update(ctx, s.pool, current)
	if err != nil {
		return nil, utils.Internal("Error al actualizar externo.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &current.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "externals",
		EntityID:  &current.ID,
		Action:    "EXTERNAL_UPDATED",
		Reason:    "Actualización de datos de externo",
		IPAddress: ip,
		UserAgent: ua,
	})

	return s.mapExternalToDTO(updated), nil
}

func (s *ExternalService) Delete(ctx context.Context, actor *middlewares.ActorContext, id int64, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.externalRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return utils.Internal("Error al consultar externo.", err)
	}
	if current == nil {
		return utils.NotFound("EXTERNAL_NOT_FOUND", "El registro externo solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para desactivar este registro externo.")
		}
	}

	if err := s.externalRepo.SoftDelete(ctx, s.pool, id); err != nil {
		return utils.Internal("Error al desactivar externo.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &current.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "externals",
		EntityID:  &current.ID,
		Action:    "EXTERNAL_DEACTIVATED",
		Reason:    "Desactivación lógica de externo",
		IPAddress: ip,
		UserAgent: ua,
	})

	return nil
}

func (s *ExternalService) mapExternalToDTO(e *repositories.ExternalEntity) *dtos.ExternalResponse {
	return &dtos.ExternalResponse{
		ID:           e.ID,
		CompanyID:    e.CompanyID,
		Kind:         e.Kind,
		Category:     e.Category,
		DocumentType: e.DocumentType,
		Document:     e.Document,
		Name:         e.Name,
		ContactName:  e.ContactName,
		ContactPhone: e.ContactPhone,
		ContactEmail: e.ContactEmail,
		Phone:        e.Phone,
		Email:        e.Email,
		Address:      e.Address,
		City:         e.City,
		TermsDays:    e.TermsDays,
		CreditLimit:  e.CreditLimit,
		Coverage:     e.Coverage,
		IsActive:     e.IsActive,
		CreatedAt:    e.CreatedAt,
		UpdatedAt:    e.UpdatedAt,
	}
}

