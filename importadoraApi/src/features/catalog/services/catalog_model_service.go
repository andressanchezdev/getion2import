package services

// catalog_model_service · modelos de moto del catálogo
// conecta con: CatalogService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en catalog_service.go)

import (
	"context"
	"strings"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/catalog/dtos"
	"importadoraApi/src/features/catalog/repositories"
)

// ListModels lista los modelos de moto según los filtros y lo que el usuario puede ver.
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

// GetModelByID devuelve el modelo de moto por su id, validando que sea de la compañía del usuario.
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

// CreateModel crea el modelo de moto con las validaciones del negocio.
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

// UpdateModel actualiza el modelo de moto con las validaciones del negocio.
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

// DeleteModel elimina el modelo de moto validando que sea de la compañía del usuario.
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
