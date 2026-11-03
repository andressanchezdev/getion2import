package services

// staff_role_service · roles y permisos: listar, crear, actualizar y desactivar roles
// conecta con: StaffService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en staff_service.go)

import (
	"context"
	"strings"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/staff/dtos"
	"importadoraApi/src/features/staff/repositories"
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
		result = append(result, dtos.RoleResponse{
			ID:          entities[i].ID,
			CompanyID:   entities[i].CompanyID,
			Code:        entities[i].Code,
			Name:        entities[i].Name,
			Description: entities[i].Description,
			IsActive:    entities[i].IsActive,
			CreatedAt:   entities[i].CreatedAt,
		})
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

	return &dtos.RoleResponse{
		ID:          entity.ID,
		CompanyID:   entity.CompanyID,
		Code:        entity.Code,
		Name:        entity.Name,
		Description: entity.Description,
		IsActive:    entity.IsActive,
		CreatedAt:   entity.CreatedAt,
	}, nil
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

	created, err := s.roleRepo.Create(ctx, s.pool, entity)
	if err != nil {
		return nil, utils.Internal("Error al registrar rol.", err)
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

	return &dtos.RoleResponse{
		ID:          created.ID,
		CompanyID:   created.CompanyID,
		Code:        created.Code,
		Name:        created.Name,
		Description: created.Description,
		IsActive:    created.IsActive,
		CreatedAt:   created.CreatedAt,
	}, nil
}

// UpdateRole actualiza el rol con las validaciones del negocio.
func (s *StaffService) UpdateRole(ctx context.Context, actor *middlewares.ActorContext, id int64, req dtos.UpdateRoleRequest, ip, ua string) (*dtos.RoleResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.roleRepo.FindByID(ctx, s.pool, id)
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

	if req.Name != nil && strings.TrimSpace(*req.Name) != "" {
		current.Name = strings.TrimSpace(*req.Name)
	}
	if req.Description != nil {
		current.Description = req.Description
	}
	if req.IsActive != nil {
		current.IsActive = *req.IsActive
	}

	updated, err := s.roleRepo.Update(ctx, s.pool, current)
	if err != nil {
		return nil, utils.Internal("Error al actualizar rol.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &current.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "roles",
		EntityID:  &current.ID,
		Action:    "ROLE_UPDATED",
		Reason:    "Actualización de rol",
		IPAddress: ip,
		UserAgent: ua,
	})

	return &dtos.RoleResponse{
		ID:          updated.ID,
		CompanyID:   updated.CompanyID,
		Code:        updated.Code,
		Name:        updated.Name,
		Description: updated.Description,
		IsActive:    updated.IsActive,
		CreatedAt:   updated.CreatedAt,
	}, nil
}

// DeactivateRole desactiva el rol sin borrar su historial.
func (s *StaffService) DeactivateRole(ctx context.Context, actor *middlewares.ActorContext, id int64, ip, ua string) error {
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

	if err := s.roleRepo.SoftDelete(ctx, s.pool, id); err != nil {
		return utils.Internal("Error al desactivar rol.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &current.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "roles",
		EntityID:  &current.ID,
		Action:    "ROLE_DEACTIVATED",
		Reason:    "Desactivación de rol",
		IPAddress: ip,
		UserAgent: ua,
	})

	return nil
}

// ListPermissions lista el catálogo de permisos que se pueden asignar.
func (s *StaffService) ListPermissions(ctx context.Context, actor *middlewares.ActorContext) ([]dtos.PermissionResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	return s.permissionRepo.ListAll(ctx, s.pool)
}
