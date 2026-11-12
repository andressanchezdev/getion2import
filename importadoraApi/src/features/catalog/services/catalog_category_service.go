package services

// catalog_category_service · categorías del catálogo
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

// ListCategories lista las categorías según los filtros y lo que el usuario puede ver.
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
			UpdatedAt:   entities[i].UpdatedAt,
		})
	}
	return result, nil
}

// GetCategoryByID devuelve la categoría por su id, validando que sea de la compañía del usuario.
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
		UpdatedAt:   entity.UpdatedAt,
	}, nil
}

// CreateCategory crea la categoría con las validaciones del negocio.
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

	// la creación y su evento van en la misma transacción: nadie recibe el aviso de un registro que no se guardó
	created, err := db.WithTxValue(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) (*repositories.CategoryEntity, error) {
		row, err := s.categoryRepo.Create(ctx, tx, entity)
		if err != nil {
			return nil, err
		}
		s.events.Record(ctx, events.NewEntityCreated(row.CompanyID, nil, events.EntityRef{Kind: events.KindCategory, ID: row.ID, Version: row.UpdatedAt}, &dtos.CategoryResponse{
			ID:          row.ID,
			CompanyID:   row.CompanyID,
			ParentID:    row.ParentID,
			ParentName:  parentName,
			Name:        row.Name,
			Description: row.Description,
			IsActive:    row.IsActive,
			CreatedAt:   row.CreatedAt,
			UpdatedAt:   row.UpdatedAt,
		}))
		return row, nil
	})
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
		UpdatedAt:   created.UpdatedAt,
	}, nil
}

// UpdateCategory actualiza la categoría con las validaciones del negocio.
func (s *CatalogService) UpdateCategory(ctx context.Context, actor *middlewares.ActorContext, id int64, req dtos.UpdateCategoryRequest, ip, ua string) (*dtos.CategoryResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.categoryRepo.FindByID(ctx, s.pool, id)
	// foto del registro antes de editarlo: de aquí sale changedFields
	beforeSnap := events.Snapshot(current)
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
	if err := utils.ValidateExpectedVersion(current.UpdatedAt, req.ExpectedVersion); err != nil {
		return nil, err
	}

	if req.ParentID != nil {
		if *req.ParentID == 0 {
			current.ParentID = nil
			current.ParentName = nil
		} else {
			if *req.ParentID == id {
				return nil, utils.BadRequest("INVALID_PARENT", "Una categoría no puede ser su propio padre.")
			}
			isDesc, err := s.isCategoryDescendant(ctx, id, *req.ParentID)
			if err != nil {
				return nil, utils.Internal("Error al validar jerarquía de categorías.", err)
			}
			if isDesc {
				return nil, utils.BadRequest("CYCLE_DETECTED", "No se puede asignar como padre a una categoría que es su propia descendiente.")
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

	var resp *dtos.CategoryResponse
	err = db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		updated, err := s.categoryRepo.Update(ctx, tx, current)
		if err != nil {
			return utils.Internal("Error al actualizar categoría.", err)
		}

		_ = s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
			CompanyID: &current.CompanyID,
			ActorType: actor.ActorType,
			ActorID:   actor.ActorID,
			Entity:    "categories",
			EntityID:  &current.ID,
			Action:    "CATEGORY_UPDATED",
			Reason:    utils.ReasonOrDefault(reason, "Actualización de categoría"),
			IPAddress: ip,
			UserAgent: ua,
		})

		resp = &dtos.CategoryResponse{
			ID:          updated.ID,
			CompanyID:   updated.CompanyID,
			ParentID:    updated.ParentID,
			ParentName:  current.ParentName,
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
				Kind:    events.KindCategory,
				ID:      updated.ID,
				Version: updated.UpdatedAt,
			}
			s.events.Record(ctx, events.NewEntityStatus(updated.CompanyID, nil, ref, catalogActiveLabel(oldActive), catalogActiveLabel(updated.IsActive), reasonPtr, resp))
		} else {
			// edición sin cambio de estado: viaja la fila ya guardada para que las tablas abiertas se actualicen sin pedirla
			ref := events.EntityRef{
				Kind:    events.KindCategory,
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

// DeleteCategory elimina la categoría validando que sea de la compañía del usuario.
func (s *CatalogService) DeleteCategory(ctx context.Context, actor *middlewares.ActorContext, id int64, reason, ip, ua string) error {
	reason, verr := utils.ValidateReason(reason)
	if verr != nil {
		return verr
	}
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

	return db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		if err := s.categoryRepo.SoftDelete(ctx, tx, id); err != nil {
			return utils.Internal("Error al desactivar categoría.", err)
		}

		_ = s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
			CompanyID: &current.CompanyID,
			ActorType: actor.ActorType,
			ActorID:   actor.ActorID,
			Entity:    "categories",
			EntityID:  &current.ID,
			Action:    "CATEGORY_DEACTIVATED",
			Reason:    reason,
			IPAddress: ip,
			UserAgent: ua,
		})

		if s.events != nil && current.IsActive {
			updated, err := s.categoryRepo.FindByID(ctx, tx, id)
			if err != nil {
				return utils.Internal("Error al recargar categoría desactivada.", err)
			}
			if updated != nil {
				resp := &dtos.CategoryResponse{
					ID:          updated.ID,
					CompanyID:   updated.CompanyID,
					ParentID:    updated.ParentID,
					ParentName:  updated.ParentName,
					Name:        updated.Name,
					Description: updated.Description,
					IsActive:    updated.IsActive,
					CreatedAt:   updated.CreatedAt,
					UpdatedAt:   updated.UpdatedAt,
				}
				ref := events.EntityRef{
					Kind:    events.KindCategory,
					ID:      updated.ID,
					Version: updated.UpdatedAt,
				}
				s.events.Record(ctx, events.NewEntityStatus(updated.CompanyID, nil, ref, "active", "inactive", &reason, resp))
			}
		}
		return nil
	})
}

func (s *CatalogService) isCategoryDescendant(ctx context.Context, ancestorID, candidateDescendantID int64) (bool, error) {
	currentID := candidateDescendantID
	visited := make(map[int64]bool)
	for currentID > 0 {
		if currentID == ancestorID {
			return true, nil
		}
		if visited[currentID] {
			break
		}
		visited[currentID] = true
		curr, err := s.categoryRepo.FindByID(ctx, s.pool, currentID)
		if err != nil || curr == nil || curr.ParentID == nil {
			break
		}
		currentID = *curr.ParentID
	}
	return false, nil
}
