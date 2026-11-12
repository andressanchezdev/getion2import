package services

// company_service.go · reglas de negocio de compañías: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas
// conecta con: los repositories y dtos de compañías; los llama el controller y la conexión llega del contenedor

import (
	"context"
	"strings"
	"time"

	"importadoraApi/src/core/config"
	"importadoraApi/src/core/db"
	"importadoraApi/src/core/events"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/companies/dtos"
	"importadoraApi/src/features/companies/repositories"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CompanyService struct {
	cfg         *config.Config
	pool        *pgxpool.Pool
	companyRepo *repositories.CompanyRepository
	auditRepo   *authRepos.AuditRepository
	authRepo    *authRepos.AuthRepository
	events      *events.Recorder
}

// NewCompanyService crea el servicio con las piezas que necesita para funcionar.
func NewCompanyService(
	cfg *config.Config,
	pool *pgxpool.Pool,
	companyRepo *repositories.CompanyRepository,
	auditRepo *authRepos.AuditRepository,
	authRepo *authRepos.AuthRepository,
	events *events.Recorder,
) *CompanyService {
	return &CompanyService{
		cfg:         cfg,
		pool:        pool,
		companyRepo: companyRepo,
		auditRepo:   auditRepo,
		authRepo:    authRepo,
		events:      events,
	}
}

// GetByID recupera la compañía validando el aislamiento multi-tenant del actor.
func (s *CompanyService) GetByID(ctx context.Context, actor *middlewares.ActorContext, id int64) (*dtos.CompanyResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	// Superadmin puede ver cualquier compañía; los demás solo la suya
	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != id {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para consultar esta compañía.")
		}
	}

	entity, err := s.companyRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar la compañía.", err)
	}
	if entity == nil {
		return nil, utils.NotFound("COMPANY_NOT_FOUND", "La compañía solicitada no existe.")
	}

	return s.mapToDTO(entity), nil
}

// List devuelve el listado paginado de compañías según el alcance del actor.
func (s *CompanyService) List(ctx context.Context, actor *middlewares.ActorContext, params utils.PageParams) ([]dtos.CompanyResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	var companyFilter *int64
	if actor.ActorType != types.ActorSuperadmin {
		companyFilter = actor.CompanyID
	}

	entities, total, err := s.companyRepo.List(ctx, s.pool, params, companyFilter)
	if err != nil {
		return nil, nil, utils.Internal("Error al listar compañías.", err)
	}

	meta := utils.BuildMeta(params.Page, params.PageSize, total)
	result := make([]dtos.CompanyResponse, 0, len(entities))
	for i := range entities {
		result = append(result, *s.mapToDTO(&entities[i]))
	}

	return result, &meta, nil
}

// Search busca compañías por coincidencia parcial en nombre, email, teléfono o ciudad.
func (s *CompanyService) Search(ctx context.Context, actor *middlewares.ActorContext, query string, params utils.PageParams) ([]dtos.CompanyResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	cleanQ := strings.TrimSpace(query)
	if cleanQ == "" {
		return s.List(ctx, actor, params)
	}

	var companyFilter *int64
	if actor.ActorType != types.ActorSuperadmin {
		companyFilter = actor.CompanyID
	}

	entities, total, err := s.companyRepo.Search(ctx, s.pool, cleanQ, params, companyFilter)
	if err != nil {
		return nil, nil, utils.Internal("Error al buscar compañías.", err)
	}

	meta := utils.BuildMeta(params.Page, params.PageSize, total)
	result := make([]dtos.CompanyResponse, 0, len(entities))
	for i := range entities {
		result = append(result, *s.mapToDTO(&entities[i]))
	}

	return result, &meta, nil
}

// Create registra una nueva compañía (exclusivo Superadmin).
func (s *CompanyService) Create(ctx context.Context, actor *middlewares.ActorContext, req dtos.CreateCompanyRequest, ip, ua string) (*dtos.CompanyResponse, error) {
	if actor == nil || actor.ActorType != types.ActorSuperadmin {
		return nil, utils.Forbidden("FORBIDDEN_SUPERADMIN", "Solo un superadministrador puede registrar compañías.")
	}

	name := strings.TrimSpace(req.Name)
	if len(name) < 2 {
		return nil, utils.BadRequest("INVALID_NAME", "El nombre de la compañía debe tener al menos 2 caracteres.")
	}

	// Verificar nombre único
	existing, err := s.companyRepo.FindByName(ctx, s.pool, name)
	if err != nil {
		return nil, utils.Internal("Error al verificar nombre de compañía.", err)
	}
	if existing != nil {
		return nil, utils.Conflict("COMPANY_NAME_EXISTS", "Ya existe una compañía registrada con ese nombre.")
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	var (
		email   *string
		phone   *string
		address *string
		city    *string
		logoURL *string
	)

	if strings.TrimSpace(req.Email) != "" {
		trimmed := strings.ToLower(strings.TrimSpace(req.Email))
		email = &trimmed
	}
	if strings.TrimSpace(req.Phone) != "" {
		trimmed := strings.TrimSpace(req.Phone)
		phone = &trimmed
	}
	if strings.TrimSpace(req.Address) != "" {
		trimmed := strings.TrimSpace(req.Address)
		address = &trimmed
	}
	if strings.TrimSpace(req.City) != "" {
		trimmed := strings.TrimSpace(req.City)
		city = &trimmed
	}
	if strings.TrimSpace(req.LogoURL) != "" {
		trimmed := strings.TrimSpace(req.LogoURL)
		logoURL = &trimmed
	}

	entity := &repositories.CompanyEntity{
		CreatedBySuperadminID: &actor.ActorID,
		Name:                  name,
		Email:                 email,
		Phone:                 phone,
		Address:               address,
		City:                  city,
		LogoURL:               logoURL,
		IsActive:              isActive,
	}

	// la creación y su evento van en la misma transacción: nadie recibe el aviso de un registro que no se guardó
	created, err := db.WithTxValue(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) (*repositories.CompanyEntity, error) {
		row, err := s.companyRepo.Create(ctx, tx, entity)
		if err != nil {
			return nil, err
		}
		s.events.Record(ctx, events.NewEntityCreated(row.ID, nil, events.EntityRef{Kind: events.KindCompany, ID: row.ID, Version: row.UpdatedAt}, s.mapToDTO(row)))
		return row, nil
	})
	if err != nil {
		return nil, utils.Internal("Error al crear la compañía.", err)
	}

	// Registro en auditoría
	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &created.ID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "companies",
		EntityID:  &created.ID,
		Action:    "COMPANY_CREATED",
		Reason:    "Creación de nueva compañía",
		IPAddress: ip,
		UserAgent: ua,
	})

	return s.mapToDTO(created), nil
}

// Update actualiza datos corporativos validando permisos del actor.
func (s *CompanyService) Update(ctx context.Context, actor *middlewares.ActorContext, id int64, req dtos.UpdateCompanyRequest, ip, ua string) (*dtos.CompanyResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	// Superadmin puede actualizar cualquier empresa; Admin solo la suya
	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != id {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para actualizar esta compañía.")
		}
	}

	current, err := s.companyRepo.FindByID(ctx, s.pool, id)
	// foto del registro antes de editarlo: de aquí sale changedFields
	beforeSnap := events.Snapshot(current)
	if err != nil {
		return nil, utils.Internal("Error al consultar la compañía.", err)
	}
	if current == nil {
		return nil, utils.NotFound("COMPANY_NOT_FOUND", "La compañía a actualizar no existe.")
	}

	if req.Name != nil {
		newName := strings.TrimSpace(*req.Name)
		if len(newName) < 2 {
			return nil, utils.BadRequest("INVALID_NAME", "El nombre de la compañía debe tener al menos 2 caracteres.")
		}
		if !strings.EqualFold(newName, current.Name) {
			existing, err := s.companyRepo.FindByName(ctx, s.pool, newName)
			if err != nil {
				return nil, utils.Internal("Error al verificar disponibilidad del nombre.", err)
			}
			if existing != nil && existing.ID != id {
				return nil, utils.Conflict("COMPANY_NAME_EXISTS", "Ya existe otra compañía con ese nombre.")
			}
			current.Name = newName
		}
	}

	if req.Email != nil {
		trimmed := strings.ToLower(strings.TrimSpace(*req.Email))
		if trimmed == "" {
			current.Email = nil
		} else {
			current.Email = &trimmed
		}
	}

	if req.Phone != nil {
		trimmed := strings.TrimSpace(*req.Phone)
		if trimmed == "" {
			current.Phone = nil
		} else {
			current.Phone = &trimmed
		}
	}

	if req.Address != nil {
		trimmed := strings.TrimSpace(*req.Address)
		if trimmed == "" {
			current.Address = nil
		} else {
			current.Address = &trimmed
		}
	}

	if req.City != nil {
		trimmed := strings.TrimSpace(*req.City)
		if trimmed == "" {
			current.City = nil
		} else {
			current.City = &trimmed
		}
	}

	if req.LogoURL != nil {
		trimmed := strings.TrimSpace(*req.LogoURL)
		if trimmed == "" {
			current.LogoURL = nil
		} else {
			current.LogoURL = &trimmed
		}
	}

	// Solo Superadmin puede activar o desactivar compañías
	wasActive := current.IsActive
	deactivationReason := ""
	if req.IsActive != nil {
		if actor.ActorType != types.ActorSuperadmin {
			return nil, utils.Forbidden("FORBIDDEN_STATUS_CHANGE", "Solo un superadministrador puede cambiar el estado de la compañía.")
		}
		var rerr error
		deactivationReason, rerr = utils.ReasonOnDeactivation(current.IsActive, req.IsActive, req.Reason)
		if rerr != nil {
			return nil, rerr
		}
		current.IsActive = *req.IsActive
	}

	var resp *dtos.CompanyResponse
	err = db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		updated, err := s.companyRepo.Update(ctx, tx, current)
		if err != nil {
			return utils.Internal("Error al actualizar la compañía.", err)
		}
		if req.IsActive != nil && !*req.IsActive {
			if err := s.revokeCompanySessions(ctx, tx, id); err != nil {
				return utils.Internal("La compañía fue suspendida, pero no se pudieron revocar todas las sesiones.", err)
			}
		}

		// Registro en auditoría
		_ = s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
			CompanyID: &updated.ID,
			ActorType: actor.ActorType,
			ActorID:   actor.ActorID,
			Entity:    "companies",
			EntityID:  &updated.ID,
			Action:    "COMPANY_UPDATED",
			Reason:    utils.ReasonOrDefault(deactivationReason, "Actualización de datos corporativos"),
			IPAddress: ip,
			UserAgent: ua,
		})

		resp = s.mapToDTO(updated)
		if wasActive != updated.IsActive {
			var rPtr *string
			if deactivationReason != "" {
				rPtr = &deactivationReason
			}
			s.events.Record(ctx, events.NewEntityStatus(
				updated.ID,
				nil,
				events.EntityRef{Kind: events.KindCompany, ID: updated.ID, Version: updated.UpdatedAt},
				activeStatus(wasActive),
				activeStatus(updated.IsActive),
				rPtr,
				resp,
			))
		} else {
			// edición sin cambio de estado: viaja la fila ya guardada para que las tablas abiertas se actualicen sin pedirla
			s.events.Record(ctx, events.NewEntityUpdated(updated.ID, nil, events.EntityRef{Kind: events.KindCompany, ID: updated.ID, Version: updated.UpdatedAt}, resp, events.ChangedFields(beforeSnap, updated)))
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return resp, nil
}

// Delete retira la compañía de la operación (exclusivo Superadmin).
func (s *CompanyService) Delete(ctx context.Context, actor *middlewares.ActorContext, id int64, reason, ip, ua string) error {
	reason, verr := utils.ValidateReason(reason)
	if verr != nil {
		return verr
	}
	if actor == nil || actor.ActorType != types.ActorSuperadmin {
		return utils.Forbidden("FORBIDDEN_SUPERADMIN", "Solo un superadministrador puede desactivar compañías.")
	}

	current, err := s.companyRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return utils.Internal("Error al consultar la compañía.", err)
	}
	if current == nil {
		return utils.NotFound("COMPANY_NOT_FOUND", "La compañía no existe o ya fue eliminada.")
	}

	wasActive := current.IsActive
	return db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		if err := s.companyRepo.SoftDelete(ctx, tx, id); err != nil {
			return utils.Internal("Error al retirar la compañía de la operación.", err)
		}

		if err := s.revokeCompanySessions(ctx, tx, id); err != nil {
			return utils.Internal("La compañía fue suspendida, pero no se pudieron revocar todas las sesiones.", err)
		}

		_ = s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
			CompanyID: &id,
			ActorType: actor.ActorType,
			ActorID:   actor.ActorID,
			Entity:    "companies",
			EntityID:  &id,
			Action:    "COMPANY_SUSPENDED",
			Reason:    reason,
			IPAddress: ip,
			UserAgent: ua,
		})

		now := time.Now().UTC()
		current.IsActive = false
		current.UpdatedAt = now
		current.DeletedAt = &now
		s.events.Record(ctx, events.NewEntityStatus(
			id,
			nil,
			events.EntityRef{Kind: events.KindCompany, ID: id, Version: now},
			activeStatus(wasActive),
			"inactive",
			&reason,
			s.mapToDTO(current),
		))
		return nil
	})
}

func (s *CompanyService) revokeCompanySessions(ctx context.Context, tx pgx.Tx, companyID int64) error {
	if s.authRepo == nil {
		return nil
	}
	if err := s.authRepo.RevokeTokensByCompany(ctx, tx, companyID); err != nil {
		return err
	}
	actors, err := s.authRepo.ListCompanyActors(ctx, tx, companyID)
	if err != nil {
		return err
	}
	for _, a := range actors {
		s.events.Record(ctx, events.NewPersonal(
			events.SessionRevoked,
			&companyID,
			string(a.ActorType),
			a.ActorID,
			events.SessionRevokedData{Reason: "company_inactive"},
		))
	}
	return nil
}

func activeStatus(active bool) string {
	if active {
		return "active"
	}
	return "inactive"
}

// mapToDTO convierte la compañía de la base en la respuesta que sale por la API.
func (s *CompanyService) mapToDTO(c *repositories.CompanyEntity) *dtos.CompanyResponse {
	var email, phone, address, city, logoURL string
	if c.Email != nil {
		email = *c.Email
	}
	if c.Phone != nil {
		phone = *c.Phone
	}
	if c.Address != nil {
		address = *c.Address
	}
	if c.City != nil {
		city = *c.City
	}
	if c.LogoURL != nil {
		logoURL = *c.LogoURL
	}

	return &dtos.CompanyResponse{
		ID:                    c.ID,
		CreatedBySuperadminID: c.CreatedBySuperadminID,
		Name:                  c.Name,
		Email:                 email,
		Phone:                 phone,
		Address:               address,
		City:                  city,
		LogoURL:               logoURL,
		IsActive:              c.IsActive,
		CreatedAt:             c.CreatedAt,
		UpdatedAt:             c.UpdatedAt,
		DeletedAt:             c.DeletedAt,
	}
}
