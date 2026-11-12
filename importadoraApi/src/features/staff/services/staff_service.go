package services

// staff_service.go · reglas de negocio de personal (administradores, empleados, roles y permisos): valida permisos, compañía y datos, coordina las transacciones y arma las respuestas
// conecta con: los repositories y dtos de personal (administradores, empleados, roles y permisos); los llama el controller y la conexión llega del contenedor

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
	"importadoraApi/src/features/staff/dtos"
	"importadoraApi/src/features/staff/repositories"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type StaffService struct {
	cfg            *config.Config
	pool           *pgxpool.Pool
	adminRepo      *repositories.AdminRepository
	roleRepo       *repositories.RoleRepository
	permissionRepo *repositories.PermissionRepository
	employeeRepo   *repositories.EmployeeRepository
	auditRepo      *authRepos.AuditRepository
	authRepo       *authRepos.AuthRepository
	events         *events.Recorder
}

// NewStaffService crea el servicio con las piezas que necesita para funcionar.
func NewStaffService(
	cfg *config.Config,
	pool *pgxpool.Pool,
	adminRepo *repositories.AdminRepository,
	roleRepo *repositories.RoleRepository,
	permissionRepo *repositories.PermissionRepository,
	employeeRepo *repositories.EmployeeRepository,
	auditRepo *authRepos.AuditRepository,
	authRepo *authRepos.AuthRepository,
	events *events.Recorder,
) *StaffService {
	return &StaffService{
		cfg:            cfg,
		pool:           pool,
		adminRepo:      adminRepo,
		roleRepo:       roleRepo,
		permissionRepo: permissionRepo,
		employeeRepo:   employeeRepo,
		auditRepo:      auditRepo,
		authRepo:       authRepo,
		events:         events,
	}
}

// ==========================================
// SERVICIOS PARA ADMINS
// ==========================================

func (s *StaffService) ListAdmins(ctx context.Context, actor *middlewares.ActorContext, filter dtos.AdminFilterQuery) ([]dtos.AdminResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	// Restringir a su compañía si no es superadmin
	if actor.ActorType != types.ActorSuperadmin {
		filter.CompanyID = actor.CompanyID
	}

	entities, total, err := s.adminRepo.List(ctx, s.pool, filter)
	if err != nil {
		return nil, nil, utils.Internal("Error al consultar administradores.", err)
	}

	meta := utils.BuildMeta(filter.Page, filter.PageSize, total)
	result := make([]dtos.AdminResponse, 0, len(entities))
	for i := range entities {
		result = append(result, *s.mapAdminToDTO(&entities[i]))
	}

	return result, &meta, nil
}

// GetAdminByID devuelve el administrador por su id, validando que sea de la compañía del usuario.
func (s *StaffService) GetAdminByID(ctx context.Context, actor *middlewares.ActorContext, id int64) (*dtos.AdminResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	entity, err := s.adminRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar el administrador.", err)
	}
	if entity == nil {
		return nil, utils.NotFound("ADMIN_NOT_FOUND", "El administrador solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != entity.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para consultar este administrador.")
		}
	}

	return s.mapAdminToDTO(entity), nil
}

// CreateAdmin crea el administrador con las validaciones del negocio.
func (s *StaffService) CreateAdmin(ctx context.Context, actor *middlewares.ActorContext, req dtos.CreateAdminRequest, ip, ua string) (*dtos.AdminResponse, error) {
	if actor == nil || actor.ActorType != types.ActorSuperadmin {
		return nil, utils.Forbidden("FORBIDDEN_SUPERADMIN", "Solo un superadministrador puede registrar administradores de compañía.")
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email == "" {
		return nil, utils.BadRequest("INVALID_EMAIL", "El correo electrónico es requerido.")
	}
	if len(req.Password) < 8 {
		return nil, utils.BadRequest("INVALID_PASSWORD", "La contraseña debe tener al menos 8 caracteres.")
	}

	// Verificar si el correo ya existe
	existing, err := s.adminRepo.FindByEmail(ctx, s.pool, email)
	if err != nil {
		return nil, utils.Internal("Error al verificar correo del administrador.", err)
	}
	if existing != nil {
		return nil, utils.Conflict("EMAIL_EXISTS", "Ya existe un administrador con este correo electrónico.")
	}

	passwordHash, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, utils.Internal("Error al procesar contraseña.", err)
	}

	docType := req.DocumentType
	if docType == "" {
		docType = types.DocCC
	}

	entity := &repositories.AdminEntity{
		CompanyID:             req.CompanyID,
		EmployeeID:            req.EmployeeID,
		CreatedBySuperadminID: &actor.ActorID,
		Email:                 email,
		PasswordHash:          passwordHash,
		FirstName:             strings.TrimSpace(req.FirstName),
		LastName:              strings.TrimSpace(req.LastName),
		DocumentType:          docType,
		Document:              req.Document,
		Phone:                 req.Phone,
		IsActive:              true,
	}

	// la creación y su evento van en la misma transacción: nadie recibe el aviso de un registro que no se guardó
	created, err := db.WithTxValue(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) (*repositories.AdminEntity, error) {
		row, err := s.adminRepo.Create(ctx, tx, entity)
		if err != nil {
			return nil, err
		}
		s.events.Record(ctx, events.NewEntityCreated(row.CompanyID, nil, events.EntityRef{Kind: events.KindAdmin, ID: row.ID, Version: row.UpdatedAt}, s.mapAdminToDTO(row)))
		return row, nil
	})
	if err != nil {
		return nil, utils.Internal("Error al registrar administrador.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &created.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "admins",
		EntityID:  &created.ID,
		Action:    "ADMIN_CREATED",
		Reason:    "Creación de administrador por superadmin",
		IPAddress: ip,
		UserAgent: ua,
	})

	return s.mapAdminToDTO(created), nil
}

// UpdateAdmin actualiza el administrador con las validaciones del negocio.
func (s *StaffService) UpdateAdmin(ctx context.Context, actor *middlewares.ActorContext, id int64, req dtos.UpdateAdminRequest, ip, ua string) (*dtos.AdminResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.adminRepo.FindByID(ctx, s.pool, id)
	// foto del registro antes de editarlo: de aquí sale changedFields
	beforeSnap := events.Snapshot(current)
	if err != nil {
		return nil, utils.Internal("Error al consultar administrador.", err)
	}
	if current == nil {
		return nil, utils.NotFound("ADMIN_NOT_FOUND", "El administrador solicitado no existe.")
	}
	if err := utils.ValidateExpectedVersion(current.UpdatedAt, req.ExpectedVersion); err != nil {
		return nil, err
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para modificar este administrador.")
		}
	}

	if req.FirstName != nil {
		current.FirstName = strings.TrimSpace(*req.FirstName)
	}
	if req.LastName != nil {
		current.LastName = strings.TrimSpace(*req.LastName)
	}
	if req.DocumentType != nil {
		current.DocumentType = *req.DocumentType
	}
	if req.Document != nil {
		current.Document = req.Document
	}
	if req.Phone != nil {
		current.Phone = req.Phone
	}
	wasActive := current.IsActive
	deactivationReason, rerr := utils.ReasonOnDeactivation(current.IsActive, req.IsActive, req.Reason)
	if rerr != nil {
		return nil, rerr
	}
	if req.IsActive != nil {
		current.IsActive = *req.IsActive
	}
	if req.Password != nil && strings.TrimSpace(*req.Password) != "" {
		if len(*req.Password) < 8 {
			return nil, utils.BadRequest("INVALID_PASSWORD", "La contraseña debe tener al menos 8 caracteres.")
		}
		hash, err := utils.HashPassword(*req.Password)
		if err != nil {
			return nil, utils.Internal("Error al procesar la contraseña.", err)
		}
		current.PasswordHash = hash
	}

	var resp *dtos.AdminResponse
	err = db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		updated, err := s.adminRepo.Update(ctx, tx, current)
		if err != nil {
			return utils.Internal("Error al actualizar administrador.", err)
		}

		// Si se inactiva el admin, revocar sus sesiones inmediatamente
		if wasActive && !updated.IsActive && s.authRepo != nil {
			if err := s.authRepo.RevokeAllActorSessions(ctx, tx, types.ActorAdmin, current.ID); err != nil {
				return utils.Internal("El administrador fue desactivado, pero no se pudieron cerrar sus sesiones.", err)
			}
			s.events.Record(ctx, events.NewPersonal(
				events.SessionRevoked,
				&current.CompanyID,
				string(types.ActorAdmin),
				current.ID,
				events.SessionRevokedData{Reason: "account_inactive"},
			))
		}

		_ = s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
			CompanyID: &current.CompanyID,
			ActorType: actor.ActorType,
			ActorID:   actor.ActorID,
			Entity:    "admins",
			EntityID:  &current.ID,
			Action:    "ADMIN_UPDATED",
			Reason:    utils.ReasonOrDefault(deactivationReason, "Actualización de administrador"),
			IPAddress: ip,
			UserAgent: ua,
		})

		resp = s.mapAdminToDTO(updated)
		if wasActive != updated.IsActive {
			var rPtr *string
			if deactivationReason != "" {
				rPtr = &deactivationReason
			}
			s.events.Record(ctx, events.NewEntityStatus(
				updated.CompanyID,
				nil,
				events.EntityRef{Kind: events.KindAdmin, ID: updated.ID, Version: updated.UpdatedAt},
				activeStatus(wasActive),
				activeStatus(updated.IsActive),
				rPtr,
				resp,
			))
		} else {
			// edición sin cambio de estado: viaja la fila ya guardada para que las tablas abiertas se actualicen sin pedirla
			s.events.Record(ctx, events.NewEntityUpdated(updated.CompanyID, nil, events.EntityRef{Kind: events.KindAdmin, ID: updated.ID, Version: updated.UpdatedAt}, resp, events.ChangedFields(beforeSnap, updated)))
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return resp, nil
}

// DeactivateAdmin desactiva el administrador sin borrar su historial.
func (s *StaffService) DeactivateAdmin(ctx context.Context, actor *middlewares.ActorContext, id int64, reason, ip, ua string) error {
	reason, verr := utils.ValidateReason(reason)
	if verr != nil {
		return verr
	}
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.adminRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return utils.Internal("Error al consultar administrador.", err)
	}
	if current == nil {
		return utils.NotFound("ADMIN_NOT_FOUND", "El administrador solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para desactivar este administrador.")
		}
		// Un admin no puede desactivarse a sí mismo
		if actor.ActorID == id {
			return utils.BadRequest("CANNOT_DEACTIVATE_SELF", "No puedes desactivar tu propia cuenta de administrador.")
		}
	}

	wasActive := current.IsActive
	return db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		if err := s.adminRepo.SoftDelete(ctx, tx, id); err != nil {
			return utils.Internal("Error al desactivar administrador.", err)
		}
		if s.authRepo != nil {
			if err := s.authRepo.RevokeAllActorSessions(ctx, tx, types.ActorAdmin, id); err != nil {
				return utils.Internal("El administrador fue desactivado, pero no se pudieron cerrar sus sesiones.", err)
			}
			s.events.Record(ctx, events.NewPersonal(
				events.SessionRevoked,
				&current.CompanyID,
				string(types.ActorAdmin),
				id,
				events.SessionRevokedData{Reason: "account_inactive"},
			))
		}

		_ = s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
			CompanyID: &current.CompanyID,
			ActorType: actor.ActorType,
			ActorID:   actor.ActorID,
			Entity:    "admins",
			EntityID:  &current.ID,
			Action:    "ADMIN_DEACTIVATED",
			Reason:    reason,
			IPAddress: ip,
			UserAgent: ua,
		})

		now := time.Now().UTC()
		current.IsActive = false
		current.UpdatedAt = now
		s.events.Record(ctx, events.NewEntityStatus(
			current.CompanyID,
			nil,
			events.EntityRef{Kind: events.KindAdmin, ID: id, Version: now},
			activeStatus(wasActive),
			"inactive",
			&reason,
			s.mapAdminToDTO(current),
		))
		return nil
	})
}

func activeStatus(active bool) string {
	if active {
		return "active"
	}
	return "inactive"
}

// mapAdminToDTO convierte el miembro del personal de la base en la respuesta que sale por la API.
func (s *StaffService) mapAdminToDTO(a *repositories.AdminEntity) *dtos.AdminResponse {
	return &dtos.AdminResponse{
		ID:                    a.ID,
		CompanyID:             a.CompanyID,
		CompanyName:           a.CompanyName,
		EmployeeID:            a.EmployeeID,
		CreatedBySuperadminID: a.CreatedBySuperadminID,
		Email:                 a.Email,
		FirstName:             a.FirstName,
		LastName:              a.LastName,
		FullName:              a.FullName,
		DocumentType:          a.DocumentType,
		Document:              a.Document,
		Phone:                 a.Phone,
		IsActive:              a.IsActive,
		LastLoginAt:           a.LastLoginAt,
		CreatedAt:             a.CreatedAt,
		UpdatedAt:             a.UpdatedAt,
	}
}

// ==========================================
// SERVICIOS PARA ROLES
// ==========================================

// ==========================================
// SERVICIOS PARA PERMISOS
// ==========================================

// ==========================================
// SERVICIOS PARA EMPLEADOS
// ==========================================
