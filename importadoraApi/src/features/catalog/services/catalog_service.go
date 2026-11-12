package services

// catalog_service.go · reglas de negocio de catálogo (marcas, categorías y modelos): valida permisos, compañía y datos, coordina las transacciones y arma las respuestas
// conecta con: los repositories y dtos de catálogo (marcas, categorías y modelos); los llama el controller y la conexión llega del contenedor

import (
	"context"
	"strings"

	"importadoraApi/src/core/config"
	"importadoraApi/src/core/db"
	"importadoraApi/src/core/events"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/catalog/dtos"
	"importadoraApi/src/features/catalog/repositories"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CatalogService struct {
	cfg          *config.Config
	pool         *pgxpool.Pool
	brandRepo    *repositories.BrandRepository
	modelRepo    *repositories.ModelRepository
	categoryRepo *repositories.CategoryRepository
	auditRepo    *authRepos.AuditRepository
	events       *events.Recorder
}

// NewCatalogService crea el servicio con las piezas que necesita para funcionar.
func NewCatalogService(
	cfg *config.Config,
	pool *pgxpool.Pool,
	brandRepo *repositories.BrandRepository,
	modelRepo *repositories.ModelRepository,
	categoryRepo *repositories.CategoryRepository,
	auditRepo *authRepos.AuditRepository,
	eventsRecorder ...*events.Recorder,
) *CatalogService {
	var rec *events.Recorder
	if len(eventsRecorder) > 0 {
		rec = eventsRecorder[0]
	}
	return &CatalogService{
		cfg:          cfg,
		pool:         pool,
		brandRepo:    brandRepo,
		modelRepo:    modelRepo,
		categoryRepo: categoryRepo,
		auditRepo:    auditRepo,
		events:       rec,
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
			UpdatedAt: entities[i].UpdatedAt,
		})
	}
	return result, nil
}

// GetBrandByID devuelve la marca por su id, validando que sea de la compañía del usuario.
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
		UpdatedAt: entity.UpdatedAt,
	}, nil
}

// CreateBrand crea la marca con las validaciones del negocio.
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

	// la creación y su evento van en la misma transacción: nadie recibe el aviso de un registro que no se guardó
	created, err := db.WithTxValue(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) (*repositories.BrandEntity, error) {
		row, err := s.brandRepo.Create(ctx, tx, entity)
		if err != nil {
			return nil, err
		}
		s.events.Record(ctx, events.NewEntityCreated(row.CompanyID, nil, events.EntityRef{Kind: events.KindBrand, ID: row.ID, Version: row.UpdatedAt}, &dtos.BrandResponse{
			ID:        row.ID,
			CompanyID: row.CompanyID,
			Name:      row.Name,
			ImageURL:  row.ImageURL,
			IsActive:  row.IsActive,
			CreatedAt: row.CreatedAt,
			UpdatedAt: row.UpdatedAt,
		}))
		return row, nil
	})
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
		UpdatedAt: created.UpdatedAt,
	}, nil
}

// UpdateBrand actualiza la marca con las validaciones del negocio.
func (s *CatalogService) UpdateBrand(ctx context.Context, actor *middlewares.ActorContext, id int64, req dtos.UpdateBrandRequest, ip, ua string) (*dtos.BrandResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.brandRepo.FindByID(ctx, s.pool, id)
	// foto del registro antes de editarlo: de aquí sale changedFields
	beforeSnap := events.Snapshot(current)
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
	if err := utils.ValidateExpectedVersion(current.UpdatedAt, req.ExpectedVersion); err != nil {
		return nil, err
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
	oldActive := current.IsActive
	reason, rerr := utils.ReasonOnDeactivation(current.IsActive, req.IsActive, req.Reason)
	if rerr != nil {
		return nil, rerr
	}
	if req.IsActive != nil {
		current.IsActive = *req.IsActive
	}

	var resp *dtos.BrandResponse
	err = db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		updated, err := s.brandRepo.Update(ctx, tx, current)
		if err != nil {
			return utils.Internal("Error al actualizar marca.", err)
		}

		_ = s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
			CompanyID: &current.CompanyID,
			ActorType: actor.ActorType,
			ActorID:   actor.ActorID,
			Entity:    "brands",
			EntityID:  &current.ID,
			Action:    "BRAND_UPDATED",
			Reason:    utils.ReasonOrDefault(reason, "Actualización de marca"),
			IPAddress: ip,
			UserAgent: ua,
		})

		resp = &dtos.BrandResponse{
			ID:        updated.ID,
			CompanyID: updated.CompanyID,
			Name:      updated.Name,
			ImageURL:  updated.ImageURL,
			IsActive:  updated.IsActive,
			CreatedAt: updated.CreatedAt,
			UpdatedAt: updated.UpdatedAt,
		}
		if s.events != nil && oldActive != updated.IsActive {
			var reasonPtr *string
			if reason != "" {
				reasonPtr = &reason
			}
			ref := events.EntityRef{
				Kind:    events.KindBrand,
				ID:      updated.ID,
				Version: updated.UpdatedAt,
			}
			s.events.Record(ctx, events.NewEntityStatus(updated.CompanyID, nil, ref, catalogActiveLabel(oldActive), catalogActiveLabel(updated.IsActive), reasonPtr, resp))
		} else {
			// edición sin cambio de estado: viaja la fila ya guardada para que las tablas abiertas se actualicen sin pedirla
			ref := events.EntityRef{
				Kind:    events.KindBrand,
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

// DeleteBrand elimina la marca validando que sea de la compañía del usuario.
func (s *CatalogService) DeleteBrand(ctx context.Context, actor *middlewares.ActorContext, id int64, reason, ip, ua string) error {
	reason, verr := utils.ValidateReason(reason)
	if verr != nil {
		return verr
	}
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

	return db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		if err := s.brandRepo.SoftDelete(ctx, tx, id); err != nil {
			return utils.Internal("Error al desactivar marca.", err)
		}

		_ = s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
			CompanyID: &current.CompanyID,
			ActorType: actor.ActorType,
			ActorID:   actor.ActorID,
			Entity:    "brands",
			EntityID:  &current.ID,
			Action:    "BRAND_DEACTIVATED",
			Reason:    reason,
			IPAddress: ip,
			UserAgent: ua,
		})

		if s.events != nil && current.IsActive {
			updated, err := s.brandRepo.FindByID(ctx, tx, id)
			if err != nil {
				return utils.Internal("Error al recargar marca desactivada.", err)
			}
			if updated != nil {
				resp := &dtos.BrandResponse{
					ID:        updated.ID,
					CompanyID: updated.CompanyID,
					Name:      updated.Name,
					ImageURL:  updated.ImageURL,
					IsActive:  updated.IsActive,
					CreatedAt: updated.CreatedAt,
					UpdatedAt: updated.UpdatedAt,
				}
				ref := events.EntityRef{
					Kind:    events.KindBrand,
					ID:      updated.ID,
					Version: updated.UpdatedAt,
				}
				s.events.Record(ctx, events.NewEntityStatus(updated.CompanyID, nil, ref, "active", "inactive", &reason, resp))
			}
		}
		return nil
	})
}

func catalogActiveLabel(active bool) string {
	if active {
		return "active"
	}
	return "inactive"
}

// ==========================================
// MÉTODOS PARA MODELOS
// ==========================================

// ==========================================
// MÉTODOS PARA CATEGORÍAS
// ==========================================
