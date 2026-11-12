package services

// catalog_model_service · modelos de moto del catálogo
// conecta con: CatalogService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en catalog_service.go)

import (
	"context"
	"strings"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/events"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/catalog/dtos"
	"importadoraApi/src/features/catalog/repositories"

	"github.com/jackc/pgx/v5"
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
			UpdatedAt:   entities[i].UpdatedAt,
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
		UpdatedAt:   entity.UpdatedAt,
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

	// la creación y su evento van en la misma transacción: nadie recibe el aviso de un registro que no se guardó
	created, err := db.WithTxValue(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) (*repositories.ModelEntity, error) {
		row, err := s.modelRepo.Create(ctx, tx, entity)
		if err != nil {
			return nil, err
		}
		s.events.Record(ctx, events.NewEntityCreated(row.CompanyID, nil, events.EntityRef{Kind: events.KindModel, ID: row.ID, Version: row.UpdatedAt}, &dtos.ModelResponse{
			ID:          row.ID,
			CompanyID:   row.CompanyID,
			Name:        row.Name,
			Description: row.Description,
			IsActive:    row.IsActive,
			CreatedAt:   row.CreatedAt,
			UpdatedAt:   row.UpdatedAt,
		}))
		return row, nil
	})
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
		UpdatedAt:   created.UpdatedAt,
	}, nil
}

// UpdateModel actualiza el modelo de moto con las validaciones del negocio.
func (s *CatalogService) UpdateModel(ctx context.Context, actor *middlewares.ActorContext, id int64, req dtos.UpdateModelRequest, ip, ua string) (*dtos.ModelResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.modelRepo.FindByID(ctx, s.pool, id)
	// foto del registro antes de editarlo: de aquí sale changedFields
	beforeSnap := events.Snapshot(current)
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
		if strings.TrimSpace(*req.Description) == "" {
			current.Description = nil
		} else {
			trimmed := strings.TrimSpace(*req.Description)
			current.Description = &trimmed
		}
	}
	oldActive := current.IsActive
	reason, rerr := utils.ReasonOnDeactivation(current.IsActive, req.IsActive, req.Reason)
	if rerr != nil {
		return nil, rerr
	}
	if req.IsActive != nil {
		current.IsActive = *req.IsActive
	}

	var resp *dtos.ModelResponse
	err = db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		updated, err := s.modelRepo.Update(ctx, tx, current)
		if err != nil {
			return utils.Internal("Error al actualizar modelo.", err)
		}

		_ = s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
			CompanyID: &current.CompanyID,
			ActorType: actor.ActorType,
			ActorID:   actor.ActorID,
			Entity:    "models",
			EntityID:  &current.ID,
			Action:    "MODEL_UPDATED",
			Reason:    utils.ReasonOrDefault(reason, "Actualización de modelo"),
			IPAddress: ip,
			UserAgent: ua,
		})

		resp = &dtos.ModelResponse{
			ID:          updated.ID,
			CompanyID:   updated.CompanyID,
			Name:        updated.Name,
			Description: updated.Description,
			IsActive:    updated.IsActive,
			CreatedAt:   updated.CreatedAt,
			UpdatedAt:   updated.UpdatedAt,
		}
		if s.events != nil && oldActive != updated.IsActive {
			var reasonPtr *string
			if reason != "" {
				reasonPtr = &reason
			}
			ref := events.EntityRef{
				Kind:    events.KindModel,
				ID:      updated.ID,
				Version: updated.UpdatedAt,
			}
			s.events.Record(ctx, events.NewEntityStatus(updated.CompanyID, nil, ref, catalogActiveLabel(oldActive), catalogActiveLabel(updated.IsActive), reasonPtr, resp))
		} else {
			// edición sin cambio de estado: viaja la fila ya guardada para que las tablas abiertas se actualicen sin pedirla
			ref := events.EntityRef{
				Kind:    events.KindModel,
				ID:      updated.ID,
				Version: updated.UpdatedAt,
			}
			s.events.Record(ctx, events.NewEntityUpdated(updated.CompanyID, nil, ref, resp, events.ChangedFields(beforeSnap, updated)))
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return resp, nil
}

// DeleteModel elimina el modelo de moto validando que sea de la compañía del usuario.
func (s *CatalogService) DeleteModel(ctx context.Context, actor *middlewares.ActorContext, id int64, reason, ip, ua string) error {
	reason, verr := utils.ValidateReason(reason)
	if verr != nil {
		return verr
	}
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

	return db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		if err := s.modelRepo.SoftDelete(ctx, tx, id); err != nil {
			return utils.Internal("Error al desactivar modelo.", err)
		}

		_ = s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
			CompanyID: &current.CompanyID,
			ActorType: actor.ActorType,
			ActorID:   actor.ActorID,
			Entity:    "models",
			EntityID:  &current.ID,
			Action:    "MODEL_DEACTIVATED",
			Reason:    reason,
			IPAddress: ip,
			UserAgent: ua,
		})

		if s.events != nil && current.IsActive {
			updated, err := s.modelRepo.FindByID(ctx, tx, id)
			if err != nil {
				return utils.Internal("Error al recargar modelo desactivado.", err)
			}
			if updated != nil {
				resp := &dtos.ModelResponse{
					ID:          updated.ID,
					CompanyID:   updated.CompanyID,
					Name:        updated.Name,
					Description: updated.Description,
					IsActive:    updated.IsActive,
					CreatedAt:   updated.CreatedAt,
					UpdatedAt:   updated.UpdatedAt,
				}
				ref := events.EntityRef{
					Kind:    events.KindModel,
					ID:      updated.ID,
					Version: updated.UpdatedAt,
				}
				s.events.Record(ctx, events.NewEntityStatus(updated.CompanyID, nil, ref, "active", "inactive", &reason, resp))
			}
		}
		return nil
	})
}
