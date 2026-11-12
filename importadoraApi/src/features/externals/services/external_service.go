package services

// external_service.go · reglas de negocio de terceros (proveedores y transportadoras): valida permisos, compañía y datos, coordina las transacciones y arma las respuestas
// conecta con: los repositories y dtos de terceros (proveedores y transportadoras); los llama el controller y la conexión llega del contenedor

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
	"importadoraApi/src/features/externals/dtos"
	"importadoraApi/src/features/externals/repositories"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ExternalService struct {
	cfg          *config.Config
	pool         *pgxpool.Pool
	externalRepo *repositories.ExternalRepository
	auditRepo    *authRepos.AuditRepository
	events       *events.Recorder
}

// NewExternalService crea el servicio con las piezas que necesita para funcionar.
func NewExternalService(
	cfg *config.Config,
	pool *pgxpool.Pool,
	externalRepo *repositories.ExternalRepository,
	auditRepo *authRepos.AuditRepository,
	eventsRecorder ...*events.Recorder,
) *ExternalService {
	var rec *events.Recorder
	if len(eventsRecorder) > 0 {
		rec = eventsRecorder[0]
	}
	return &ExternalService{
		cfg:          cfg,
		pool:         pool,
		externalRepo: externalRepo,
		auditRepo:    auditRepo,
		events:       rec,
	}
}

// List devuelve los terceros paginados según los filtros, limitados a lo que el usuario puede ver.
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

// Search busca los terceros por texto.
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

// GetByID devuelve el tercero por su id, validando que sea de la compañía del usuario.
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

// Create crea el tercero con las validaciones del negocio (compañía, duplicados y permisos).
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

	// la creación y su evento van en la misma transacción: nadie recibe el aviso de un registro que no se guardó
	created, err := db.WithTxValue(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) (*repositories.ExternalEntity, error) {
		row, err := s.externalRepo.Create(ctx, tx, entity)
		if err != nil {
			return nil, err
		}
		s.events.Record(ctx, events.NewEntityCreated(row.CompanyID, nil, events.EntityRef{Kind: externalEventKind(row.Kind), ID: row.ID, Version: row.UpdatedAt}, s.mapExternalToDTO(row)))
		return row, nil
	})
	if err != nil {
		return nil, utils.NormalizeDBError(err, "")
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

// Update actualiza el tercero con las validaciones del negocio.
func (s *ExternalService) Update(ctx context.Context, actor *middlewares.ActorContext, id int64, req dtos.UpdateExternalRequest, ip, ua string) (*dtos.ExternalResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.externalRepo.FindByID(ctx, s.pool, id)
	// foto del registro antes de editarlo: de aquí sale changedFields
	beforeSnap := events.Snapshot(current)
	if err != nil {
		return nil, utils.Internal("Error al consultar externo.", err)
	}
	if current == nil {
		return nil, utils.NotFound("EXTERNAL_NOT_FOUND", "El registro externo solicitado no existe.")
	}
	if err := utils.ValidateExpectedVersion(current.UpdatedAt, req.ExpectedVersion); err != nil {
		return nil, err
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
	oldActive := current.IsActive
	reason, rerr := utils.ReasonOnDeactivation(current.IsActive, req.IsActive, req.Reason)
	if rerr != nil {
		return nil, rerr
	}
	if req.IsActive != nil {
		current.IsActive = *req.IsActive
	}

	var resp *dtos.ExternalResponse
	err = db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		updated, err := s.externalRepo.Update(ctx, tx, current)
		if err != nil {
			return utils.NormalizeDBError(err, "El proveedor o transportadora no existe.")
		}

		_ = s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
			CompanyID: &current.CompanyID,
			ActorType: actor.ActorType,
			ActorID:   actor.ActorID,
			Entity:    "externals",
			EntityID:  &current.ID,
			Action:    "EXTERNAL_UPDATED",
			Reason:    utils.ReasonOrDefault(reason, "Actualización de datos de externo"),
			IPAddress: ip,
			UserAgent: ua,
		})

		resp = s.mapExternalToDTO(updated)
		if s.events != nil && oldActive != updated.IsActive {
			var reasonPtr *string
			if reason != "" {
				reasonPtr = &reason
			}
			ref := events.EntityRef{
				Kind:    externalEventKind(updated.Kind),
				ID:      updated.ID,
				Version: updated.UpdatedAt,
			}
			s.events.Record(ctx, events.NewEntityStatus(updated.CompanyID, nil, ref, externalActiveLabel(oldActive), externalActiveLabel(updated.IsActive), reasonPtr, resp))
		} else {
			// edición sin cambio de estado: viaja la fila ya guardada para que las tablas abiertas se actualicen sin pedirla
			ref := events.EntityRef{
				Kind:    externalEventKind(updated.Kind),
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

// Delete elimina el tercero validando que sea de la compañía del usuario.
func (s *ExternalService) Delete(ctx context.Context, actor *middlewares.ActorContext, id int64, reason, ip, ua string) error {
	reason, verr := utils.ValidateReason(reason)
	if verr != nil {
		return verr
	}
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

	return db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		if err := s.externalRepo.SoftDelete(ctx, tx, id); err != nil {
			return utils.Internal("Error al desactivar externo.", err)
		}

		_ = s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
			CompanyID: &current.CompanyID,
			ActorType: actor.ActorType,
			ActorID:   actor.ActorID,
			Entity:    "externals",
			EntityID:  &current.ID,
			Action:    "EXTERNAL_DEACTIVATED",
			Reason:    reason,
			IPAddress: ip,
			UserAgent: ua,
		})

		if s.events != nil && current.IsActive {
			updated, err := s.externalRepo.FindByID(ctx, tx, id)
			if err != nil {
				return utils.Internal("Error al recargar externo desactivado.", err)
			}
			if updated != nil {
				ref := events.EntityRef{
					Kind:    externalEventKind(updated.Kind),
					ID:      updated.ID,
					Version: updated.UpdatedAt,
				}
				s.events.Record(ctx, events.NewEntityStatus(updated.CompanyID, nil, ref, "active", "inactive", &reason, s.mapExternalToDTO(updated)))
			}
		}
		return nil
	})
}

func externalEventKind(k types.ExternalKind) events.Kind {
	if k == types.ExternalCarrier {
		return events.KindCarrier
	}
	return events.KindSupplier
}

func externalActiveLabel(active bool) string {
	if active {
		return "active"
	}
	return "inactive"
}

// mapExternalToDTO convierte el tercero de la base en la respuesta que sale por la API.
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
