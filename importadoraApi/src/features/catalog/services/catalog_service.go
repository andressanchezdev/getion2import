package services

import (
	"context"
	"strings"

	"importadoraApi/src/core/config"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/catalog/dtos"
	"importadoraApi/src/features/catalog/repositories"

	"github.com/jackc/pgx/v5/pgxpool"
)

type CatalogService struct {
	cfg          *config.Config
	pool         *pgxpool.Pool
	brandRepo    *repositories.BrandRepository
	modelRepo    *repositories.ModelRepository
	categoryRepo *repositories.CategoryRepository
	auditRepo    *authRepos.AuditRepository
}

func NewCatalogService(
	cfg *config.Config,
	pool *pgxpool.Pool,
	brandRepo *repositories.BrandRepository,
	modelRepo *repositories.ModelRepository,
	categoryRepo *repositories.CategoryRepository,
	auditRepo *authRepos.AuditRepository,
) *CatalogService {
	return &CatalogService{
		cfg:          cfg,
		pool:         pool,
		brandRepo:    brandRepo,
		modelRepo:    modelRepo,
		categoryRepo: categoryRepo,
		auditRepo:    auditRepo,
	}
}

// ==========================================
// MÉTODOS PARA MARCAS
// ==========================================

func (s *CatalogService) ListBrands(ctx context.Context, actor *middlewares.ActorContext, targetCompanyID *int64, activeOnly bool) ([]dtos.BrandResponse, error) {
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

	entities, err := s.brandRepo.ListByCompany(ctx, s.pool, *companyID, activeOnly)
	if err != nil {
		return nil, utils.Internal("Error al consultar marcas.", err)
	}

	result := make([]dtos.BrandResponse, 0, len(entities))
	for i := range entities {
		result = append(result, dtos.BrandResponse{
			ID:        entities[i].ID,
			CompanyID: entities[i].CompanyID,
			Name:      entities[i].Name,
			ImageURL:  entities[i].ImageURL,
			IsActive:  entities[i].IsActive,
			CreatedAt: entities[i].CreatedAt,
		})
	}
	return result, nil
}

func (s *CatalogService) GetBrandByID(ctx context.Context, actor *middlewares.ActorContext, id int64) (*dtos.BrandResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	entity, err := s.brandRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar marca.", err)
	}
	if entity == nil {
		return nil, utils.NotFound("BRAND_NOT_FOUND", "La marca solicitada no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != entity.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para consultar esta marca.")
		}
	}

	return &dtos.BrandResponse{
		ID:        entity.ID,
		CompanyID: entity.CompanyID,
		Name:      entity.Name,
		ImageURL:  entity.ImageURL,
		IsActive:  entity.IsActive,
		CreatedAt: entity.CreatedAt,
	}, nil
}

func (s *CatalogService) CreateBrand(ctx context.Context, actor *middlewares.ActorContext, req dtos.CreateBrandRequest, ip, ua string) (*dtos.BrandResponse, error) {
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
		return nil, utils.BadRequest("INVALID_NAME", "El nombre de la marca es requerido.")
	}

	existing, err := s.brandRepo.FindByCompanyAndName(ctx, s.pool, *companyID, nameClean)
	if err != nil {
		return nil, utils.Internal("Error al verificar marca.", err)
	}
	if existing != nil {
		return nil, utils.Conflict("BRAND_EXISTS", "Ya existe una marca con ese nombre en la compañía.")
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	entity := &repositories.BrandEntity{
		CompanyID: *companyID,
		Name:      nameClean,
		ImageURL:  req.ImageURL,
		IsActive:  isActive,
	}

	created, err := s.brandRepo.Create(ctx, s.pool, entity)
	if err != nil {
		return nil, utils.Internal("Error al registrar marca.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: companyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "brands",
		EntityID:  &created.ID,
		Action:    "BRAND_CREATED",
		Reason:    "Creación de marca en catálogo",
		IPAddress: ip,
		UserAgent: ua,
	})

	return &dtos.BrandResponse{
		ID:        created.ID,
		CompanyID: created.CompanyID,
		Name:      created.Name,
		ImageURL:  created.ImageURL,
		IsActive:  created.IsActive,
		CreatedAt: created.CreatedAt,
	}, nil
}

func (s *CatalogService) UpdateBrand(ctx context.Context, actor *middlewares.ActorContext, id int64, req dtos.UpdateBrandRequest, ip, ua string) (*dtos.BrandResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.brandRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar marca.", err)
	}
	if current == nil {
		return nil, utils.NotFound("BRAND_NOT_FOUND", "La marca solicitada no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para modificar esta marca.")
		}
	}

	if req.Name != nil && strings.TrimSpace(*req.Name) != "" {
		cleanName := strings.TrimSpace(*req.Name)
		if cleanName != current.Name {
			existing, err := s.brandRepo.FindByCompanyAndName(ctx, s.pool, current.CompanyID, cleanName)
			if err != nil {
				return nil, utils.Internal("Error al verificar marca.", err)
			}
			if existing != nil && existing.ID != current.ID {
				return nil, utils.Conflict("BRAND_EXISTS", "Ya existe otra marca con ese nombre en la compañía.")
			}
			current.Name = cleanName
		}
	}

	if req.ImageURL != nil {
		current.ImageURL = req.ImageURL
	}
	if req.IsActive != nil {
		current.IsActive = *req.IsActive
	}

	updated, err := s.brandRepo.Update(ctx, s.pool, current)
	if err != nil {
		return nil, utils.Internal("Error al actualizar marca.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &current.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "brands",
		EntityID:  &current.ID,
		Action:    "BRAND_UPDATED",
		Reason:    "Actualización de marca",
		IPAddress: ip,
		UserAgent: ua,
	})

	return &dtos.BrandResponse{
		ID:        updated.ID,
		CompanyID: updated.CompanyID,
		Name:      updated.Name,
		ImageURL:  updated.ImageURL,
		IsActive:  updated.IsActive,
		CreatedAt: updated.CreatedAt,
	}, nil
}

func (s *CatalogService) DeleteBrand(ctx context.Context, actor *middlewares.ActorContext, id int64, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.brandRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return utils.Internal("Error al consultar marca.", err)
	}
	if current == nil {
		return utils.NotFound("BRAND_NOT_FOUND", "La marca solicitada no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para desactivar esta marca.")
		}
	}

	if err := s.brandRepo.SoftDelete(ctx, s.pool, id); err != nil {
		return utils.Internal("Error al desactivar marca.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &current.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "brands",
		EntityID:  &current.ID,
		Action:    "BRAND_DEACTIVATED",
		Reason:    "Desactivación lógica de marca",
		IPAddress: ip,
		UserAgent: ua,
	})

	return nil
}

// ==========================================
// MÉTODOS PARA MODELOS
// ==========================================

func (s *CatalogService) ListModels(ctx context.Context, actor *middlewares.ActorContext, targetCompanyID *int64, activeOnly bool) ([]dtos.ModelResponse, error) {
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

	entities, err := s.modelRepo.ListByCompany(ctx, s.pool, *companyID, activeOnly)
	if err != nil {
		return nil, utils.Internal("Error al consultar modelos.", err)
	}

	result := make([]dtos.ModelResponse, 0, len(entities))
	for i := range entities {
		result = append(result, dtos.ModelResponse{
			ID:          entities[i].ID,
			CompanyID:   entities[i].CompanyID,
			Name:        entities[i].Name,
			Description: entities[i].Description,
			IsActive:    entities[i].IsActive,
			CreatedAt:   entities[i].CreatedAt,
		})
	}
	return result, nil
}

func (s *CatalogService) GetModelByID(ctx context.Context, actor *middlewares.ActorContext, id int64) (*dtos.ModelResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	entity, err := s.modelRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar modelo.", err)
	}
	if entity == nil {
		return nil, utils.NotFound("MODEL_NOT_FOUND", "El modelo solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != entity.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para consultar este modelo.")
		}
	}

	return &dtos.ModelResponse{
		ID:          entity.ID,
		CompanyID:   entity.CompanyID,
		Name:        entity.Name,
		Description: entity.Description,
		IsActive:    entity.IsActive,
		CreatedAt:   entity.CreatedAt,
	}, nil
}

func (s *CatalogService) CreateModel(ctx context.Context, actor *middlewares.ActorContext, req dtos.CreateModelRequest, ip, ua string) (*dtos.ModelResponse, error) {
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
		return nil, utils.BadRequest("INVALID_NAME", "El nombre del modelo es requerido.")
	}

	existing, err := s.modelRepo.FindByCompanyAndName(ctx, s.pool, *companyID, nameClean)
	if err != nil {
		return nil, utils.Internal("Error al verificar modelo.", err)
	}
	if existing != nil {
		return nil, utils.Conflict("MODEL_EXISTS", "Ya existe un modelo con ese nombre en la compañía.")
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	entity := &repositories.ModelEntity{
		CompanyID:   *companyID,
		Name:        nameClean,
		Description: req.Description,
		IsActive:    isActive,
	}

	created, err := s.modelRepo.Create(ctx, s.pool, entity)
	if err != nil {
		return nil, utils.Internal("Error al registrar modelo.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: companyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "models",
		EntityID:  &created.ID,
		Action:    "MODEL_CREATED",
		Reason:    "Creación de modelo en catálogo",
		IPAddress: ip,
		UserAgent: ua,
	})

	return &dtos.ModelResponse{
		ID:          created.ID,
		CompanyID:   created.CompanyID,
		Name:        created.Name,
		Description: created.Description,
		IsActive:    created.IsActive,
		CreatedAt:   created.CreatedAt,
	}, nil
}

func (s *CatalogService) UpdateModel(ctx context.Context, actor *middlewares.ActorContext, id int64, req dtos.UpdateModelRequest, ip, ua string) (*dtos.ModelResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.modelRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar modelo.", err)
	}
	if current == nil {
		return nil, utils.NotFound("MODEL_NOT_FOUND", "El modelo solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para modificar este modelo.")
		}
	}

	if req.Name != nil && strings.TrimSpace(*req.Name) != "" {
		cleanName := strings.TrimSpace(*req.Name)
		if cleanName != current.Name {
			existing, err := s.modelRepo.FindByCompanyAndName(ctx, s.pool, current.CompanyID, cleanName)
			if err != nil {
				return nil, utils.Internal("Error al verificar modelo.", err)
			}
			if existing != nil && existing.ID != current.ID {
				return nil, utils.Conflict("MODEL_EXISTS", "Ya existe otro modelo con ese nombre en la compañía.")
			}
			current.Name = cleanName
		}
	}

	if req.Description != nil {
		current.Description = req.Description
	}
	if req.IsActive != nil {
		current.IsActive = *req.IsActive
	}

	updated, err := s.modelRepo.Update(ctx, s.pool, current)
	if err != nil {
		return nil, utils.Internal("Error al actualizar modelo.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &current.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "models",
		EntityID:  &current.ID,
		Action:    "MODEL_UPDATED",
		Reason:    "Actualización de modelo",
		IPAddress: ip,
		UserAgent: ua,
	})

	return &dtos.ModelResponse{
		ID:          updated.ID,
		CompanyID:   updated.CompanyID,
		Name:        updated.Name,
		Description: updated.Description,
		IsActive:    updated.IsActive,
		CreatedAt:   updated.CreatedAt,
	}, nil
}

func (s *CatalogService) DeleteModel(ctx context.Context, actor *middlewares.ActorContext, id int64, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.modelRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return utils.Internal("Error al consultar modelo.", err)
	}
	if current == nil {
		return utils.NotFound("MODEL_NOT_FOUND", "El modelo solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para desactivar este modelo.")
		}
	}

	if err := s.modelRepo.SoftDelete(ctx, s.pool, id); err != nil {
		return utils.Internal("Error al desactivar modelo.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &current.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "models",
		EntityID:  &current.ID,
		Action:    "MODEL_DEACTIVATED",
		Reason:    "Desactivación lógica de modelo",
		IPAddress: ip,
		UserAgent: ua,
	})

	return nil
}

// ==========================================
// MÉTODOS PARA CATEGORÍAS
// ==========================================

func (s *CatalogService) ListCategories(ctx context.Context, actor *middlewares.ActorContext, targetCompanyID *int64, activeOnly bool) ([]dtos.CategoryResponse, error) {
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

	entities, err := s.categoryRepo.ListByCompany(ctx, s.pool, *companyID, activeOnly)
	if err != nil {
		return nil, utils.Internal("Error al consultar categorías.", err)
	}

	result := make([]dtos.CategoryResponse, 0, len(entities))
	for i := range entities {
		result = append(result, dtos.CategoryResponse{
			ID:          entities[i].ID,
			CompanyID:   entities[i].CompanyID,
			ParentID:    entities[i].ParentID,
			ParentName:  entities[i].ParentName,
			Name:        entities[i].Name,
			Description: entities[i].Description,
			IsActive:    entities[i].IsActive,
			CreatedAt:   entities[i].CreatedAt,
		})
	}
	return result, nil
}

func (s *CatalogService) GetCategoryByID(ctx context.Context, actor *middlewares.ActorContext, id int64) (*dtos.CategoryResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	entity, err := s.categoryRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar categoría.", err)
	}
	if entity == nil {
		return nil, utils.NotFound("CATEGORY_NOT_FOUND", "La categoría solicitada no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != entity.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para consultar esta categoría.")
		}
	}

	return &dtos.CategoryResponse{
		ID:          entity.ID,
		CompanyID:   entity.CompanyID,
		ParentID:    entity.ParentID,
		ParentName:  entity.ParentName,
		Name:        entity.Name,
		Description: entity.Description,
		IsActive:    entity.IsActive,
		CreatedAt:   entity.CreatedAt,
	}, nil
}

func (s *CatalogService) CreateCategory(ctx context.Context, actor *middlewares.ActorContext, req dtos.CreateCategoryRequest, ip, ua string) (*dtos.CategoryResponse, error) {
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
		return nil, utils.BadRequest("INVALID_NAME", "El nombre de la categoría es requerido.")
	}

	// Validar parent_id si existe
	var parentName *string
	if req.ParentID != nil {
		parent, err := s.categoryRepo.FindByID(ctx, s.pool, *req.ParentID)
		if err != nil {
			return nil, utils.Internal("Error al validar categoría padre.", err)
		}
		if parent == nil || parent.CompanyID != *companyID {
			return nil, utils.BadRequest("INVALID_PARENT", "La categoría padre especificada no existe en la compañía.")
		}
		parentName = &parent.Name
	}

	existing, err := s.categoryRepo.FindByCompanyParentAndName(ctx, s.pool, *companyID, req.ParentID, nameClean)
	if err != nil {
		return nil, utils.Internal("Error al verificar categoría.", err)
	}
	if existing != nil {
		return nil, utils.Conflict("CATEGORY_EXISTS", "Ya existe una categoría con ese nombre en este nivel jerárquico.")
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	entity := &repositories.CategoryEntity{
		CompanyID:   *companyID,
		ParentID:    req.ParentID,
		Name:        nameClean,
		Description: req.Description,
		IsActive:    isActive,
	}

	created, err := s.categoryRepo.Create(ctx, s.pool, entity)
	if err != nil {
		return nil, utils.Internal("Error al registrar categoría.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: companyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "categories",
		EntityID:  &created.ID,
		Action:    "CATEGORY_CREATED",
		Reason:    "Creación de categoría de productos",
		IPAddress: ip,
		UserAgent: ua,
	})

	return &dtos.CategoryResponse{
		ID:          created.ID,
		CompanyID:   created.CompanyID,
		ParentID:    created.ParentID,
		ParentName:  parentName,
		Name:        created.Name,
		Description: created.Description,
		IsActive:    created.IsActive,
		CreatedAt:   created.CreatedAt,
	}, nil
}

func (s *CatalogService) UpdateCategory(ctx context.Context, actor *middlewares.ActorContext, id int64, req dtos.UpdateCategoryRequest, ip, ua string) (*dtos.CategoryResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.categoryRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar categoría.", err)
	}
	if current == nil {
		return nil, utils.NotFound("CATEGORY_NOT_FOUND", "La categoría solicitada no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para modificar esta categoría.")
		}
	}

	if req.ParentID != nil {
		if *req.ParentID == id {
			return nil, utils.BadRequest("INVALID_PARENT", "Una categoría no puede ser su propio padre.")
		}
		parent, err := s.categoryRepo.FindByID(ctx, s.pool, *req.ParentID)
		if err != nil {
			return nil, utils.Internal("Error al validar categoría padre.", err)
		}
		if parent == nil || parent.CompanyID != current.CompanyID {
			return nil, utils.BadRequest("INVALID_PARENT", "La categoría padre no existe en esta empresa.")
		}
		current.ParentID = req.ParentID
		current.ParentName = &parent.Name
	}

	if req.Name != nil && strings.TrimSpace(*req.Name) != "" {
		cleanName := strings.TrimSpace(*req.Name)
		if cleanName != current.Name {
			existing, err := s.categoryRepo.FindByCompanyParentAndName(ctx, s.pool, current.CompanyID, current.ParentID, cleanName)
			if err != nil {
				return nil, utils.Internal("Error al verificar categoría.", err)
			}
			if existing != nil && existing.ID != current.ID {
				return nil, utils.Conflict("CATEGORY_EXISTS", "Ya existe otra categoría con ese nombre en este nivel jerárquico.")
			}
			current.Name = cleanName
		}
	}

	if req.Description != nil {
		current.Description = req.Description
	}
	if req.IsActive != nil {
		current.IsActive = *req.IsActive
	}

	updated, err := s.categoryRepo.Update(ctx, s.pool, current)
	if err != nil {
		return nil, utils.Internal("Error al actualizar categoría.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &current.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "categories",
		EntityID:  &current.ID,
		Action:    "CATEGORY_UPDATED",
		Reason:    "Actualización de categoría",
		IPAddress: ip,
		UserAgent: ua,
	})

	return &dtos.CategoryResponse{
		ID:          updated.ID,
		CompanyID:   updated.CompanyID,
		ParentID:    updated.ParentID,
		ParentName:  current.ParentName,
		Name:        updated.Name,
		Description: updated.Description,
		IsActive:    updated.IsActive,
		CreatedAt:   updated.CreatedAt,
	}, nil
}

func (s *CatalogService) DeleteCategory(ctx context.Context, actor *middlewares.ActorContext, id int64, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.categoryRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return utils.Internal("Error al consultar categoría.", err)
	}
	if current == nil {
		return utils.NotFound("CATEGORY_NOT_FOUND", "La categoría solicitada no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para desactivar esta categoría.")
		}
	}

	if err := s.categoryRepo.SoftDelete(ctx, s.pool, id); err != nil {
		return utils.Internal("Error al desactivar categoría.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &current.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "categories",
		EntityID:  &current.ID,
		Action:    "CATEGORY_DEACTIVATED",
		Reason:    "Desactivación lógica de categoría",
		IPAddress: ip,
		UserAgent: ua,
	})

	return nil
}

