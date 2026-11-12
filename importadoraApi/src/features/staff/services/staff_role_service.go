package services

// staff_role_service · roles y permisos: listar, crear, actualizar y desactivar roles
// conecta con: StaffService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en staff_service.go)

import (
	"context"
	"strings"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/events"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/staff/dtos"
	"importadoraApi/src/features/staff/repositories"

	"github.com/jackc/pgx/v5"
)

// ListRoles lista los roles según los filtros y lo que el usuario puede ver.
func (s *StaffService) ListRoles(ctx context.Context, actor *middlewares.ActorContext, targetCompanyID *int64, activeOnly bool) ([]dtos.RoleResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	companyID := targetCompanyID
	if actor.ActorType != types.ActorSuperadmin {
		companyID = actor.CompanyID
	}
	if companyID == nil {
		return nil, utils.BadRequest("MISSING_COMPANY_ID", "El parámetro companyId es requerido.")
	}

	entities, err := s.roleRepo.ListByCompany(ctx, s.pool, *companyID, activeOnly)
	if err != nil {
		return nil, utils.Internal("Error al consultar roles.", err)
	}

	result := make([]dtos.RoleResponse, 0, len(entities))
	for i := range entities {
		result = append(result, *mapRoleToDTO(&entities[i]))
	}
	return result, nil
}

// GetRoleByID devuelve el rol por su id, validando que sea de la compañía del usuario.
func (s *StaffService) GetRoleByID(ctx context.Context, actor *middlewares.ActorContext, id int64) (*dtos.RoleResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	entity, err := s.roleRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar el rol.", err)
	}
	if entity == nil {
		return nil, utils.NotFound("ROLE_NOT_FOUND", "El rol solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != entity.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para consultar este rol.")
		}
	}

	return mapRoleToDTO(entity), nil
}

// CreateRole crea el rol con las validaciones del negocio.
func (s *StaffService) CreateRole(ctx context.Context, actor *middlewares.ActorContext, req dtos.CreateRoleRequest, ip, ua string) (*dtos.RoleResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	companyID := req.CompanyID
	if actor.ActorType != types.ActorSuperadmin {
		companyID = actor.CompanyID
	}
	if companyID == nil {
		return nil, utils.BadRequest("MISSING_COMPANY_ID", "El parámetro companyId es requerido.")
	}

	code := strings.ToUpper(strings.TrimSpace(req.Code))
	name := strings.TrimSpace(req.Name)
	if code == "" || name == "" {
		return nil, utils.BadRequest("INVALID_DATA", "El código y el nombre del rol son requeridos.")
	}

	existing, err := s.roleRepo.FindByCompanyAndCode(ctx, s.pool, *companyID, code)
	if err != nil {
		return nil, utils.Internal("Error al verificar código del rol.", err)
	}
	if existing != nil {
		return nil, utils.Conflict("ROLE_CODE_EXISTS", "Ya existe un rol con ese código en la empresa.")
	}

	entity := &repositories.RoleEntity{
		CompanyID:   *companyID,
		Code:        code,
		Name:        name,
		Description: req.Description,
		IsActive:    true,
	}

	// la creación y su evento van en la misma transacción: nadie recibe el aviso de un registro que no se guardó
	created, err := db.WithTxValue(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) (*repositories.RoleEntity, error) {
		row, err := s.roleRepo.Create(ctx, tx, entity)
		if err != nil {
			return nil, err
		}
		s.events.Record(ctx, events.NewEntityCreated(row.CompanyID, nil, events.EntityRef{Kind: events.KindRole, ID: row.ID, Version: row.UpdatedAt}, mapRoleToDTO(row)))
		return row, nil
	})
	if err != nil {
		return nil, utils.NormalizeDBError(err, "")
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: companyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "roles",
		EntityID:  &created.ID,
		Action:    "ROLE_CREATED",
		Reason:    "Creación de rol de seguridad",
		IPAddress: ip,
		UserAgent: ua,
	})

	return mapRoleToDTO(created), nil
}

// UpdateRole actualiza el rol con las validaciones del negocio.
func (s *StaffService) UpdateRole(ctx context.Context, actor *middlewares.ActorContext, id int64, req dtos.UpdateRoleRequest, ip, ua string) (*dtos.RoleResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.roleRepo.FindByID(ctx, s.pool, id)
	// foto del registro antes de editarlo: de aquí sale changedFields
	beforeSnap := events.Snapshot(current)
	if err != nil {
		return nil, utils.Internal("Error al consultar el rol.", err)
	}
	if current == nil {
		return nil, utils.NotFound("ROLE_NOT_FOUND", "El rol solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para modificar este rol.")
		}
	}

	wasActive := current.IsActive
	if req.Name != nil && strings.TrimSpace(*req.Name) != "" {
		current.Name = strings.TrimSpace(*req.Name)
	}
	if req.Description != nil {
		current.Description = req.Description
	}
	deactivationReason, rerr := utils.ReasonOnDeactivation(current.IsActive, req.IsActive, req.Reason)
	if rerr != nil {
		return nil, rerr
	}
	if req.IsActive != nil {
		current.IsActive = *req.IsActive
	}

	var resp *dtos.RoleResponse
	err = db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		updated, err := s.roleRepo.Update(ctx, tx, current)
		if err != nil {
			return utils.NormalizeDBError(err, "El rol no existe.")
		}

		_ = s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
			CompanyID: &current.CompanyID,
			ActorType: actor.ActorType,
			ActorID:   actor.ActorID,
			Entity:    "roles",
			EntityID:  &current.ID,
			Action:    "ROLE_UPDATED",
			Reason:    utils.ReasonOrDefault(deactivationReason, "Actualización de rol"),
			IPAddress: ip,
			UserAgent: ua,
		})

		resp = mapRoleToDTO(updated)
		if wasActive != updated.IsActive {
			var rPtr *string
			if deactivationReason != "" {
				rPtr = &deactivationReason
			}
			s.events.Record(ctx, events.NewEntityStatus(
				updated.CompanyID,
				nil,
				events.EntityRef{Kind: events.KindRole, ID: updated.ID, Version: updated.UpdatedAt},
				activeStatus(wasActive),
				activeStatus(updated.IsActive),
				rPtr,
				resp,
			))
		} else {
			// edición sin cambio de estado: viaja la fila ya guardada para que las tablas abiertas se actualicen sin pedirla
			s.events.Record(ctx, events.NewEntityUpdated(updated.CompanyID, nil, events.EntityRef{Kind: events.KindRole, ID: updated.ID, Version: updated.UpdatedAt}, resp, events.ChangedFields(beforeSnap, updated)))
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return resp, nil
}

// DeactivateRole desactiva el rol sin borrar su historial.
func (s *StaffService) DeactivateRole(ctx context.Context, actor *middlewares.ActorContext, id int64, reason, ip, ua string) error {
	reason, verr := utils.ValidateReason(reason)
	if verr != nil {
		return verr
	}
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.roleRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return utils.Internal("Error al consultar el rol.", err)
	}
	if current == nil {
		return utils.NotFound("ROLE_NOT_FOUND", "El rol solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para desactivar este rol.")
		}
	}

	wasActive := current.IsActive
	return db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		if err := s.roleRepo.SoftDelete(ctx, tx, id); err != nil {
			return utils.Internal("Error al desactivar rol.", err)
		}

		_ = s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
			CompanyID: &current.CompanyID,
			ActorType: actor.ActorType,
			ActorID:   actor.ActorID,
			Entity:    "roles",
			EntityID:  &current.ID,
			Action:    "ROLE_DEACTIVATED",
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
			events.EntityRef{Kind: events.KindRole, ID: id, Version: now},
			activeStatus(wasActive),
			"inactive",
			&reason,
			mapRoleToDTO(current),
		))
		return nil
	})
}

func mapRoleToDTO(r *repositories.RoleEntity) *dtos.RoleResponse {
	return &dtos.RoleResponse{
		ID:          r.ID,
		CompanyID:   r.CompanyID,
		Code:        r.Code,
		Name:        r.Name,
		Description: r.Description,
		IsActive:    r.IsActive,
		CreatedAt:   r.CreatedAt,
		UpdatedAt:   r.UpdatedAt,
	}
}

// ListPermissions lista el catálogo de permisos que se pueden asignar.
func (s *StaffService) ListPermissions(ctx context.Context, actor *middlewares.ActorContext) ([]dtos.PermissionResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	return s.permissionRepo.ListAll(ctx, s.pool)
}
