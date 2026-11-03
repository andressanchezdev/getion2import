package services

// staff_employee_access_service · credenciales, permisos y desbloqueo de empleados
// conecta con: StaffService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en staff_employee_service.go)

import (
	"context"
	"time"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/staff/dtos"
	"importadoraApi/src/features/staff/repositories"
)

// UpdateEmployeeCredentials cambia la contraseña de un empleado.
func (s *StaffService) UpdateEmployeeCredentials(ctx context.Context, actor *middlewares.ActorContext, id int64, req dtos.UpdateCredentialsRequest, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.employeeRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return utils.Internal("Error al consultar empleado.", err)
	}
	if current == nil {
		return utils.NotFound("EMPLOYEE_NOT_FOUND", "El empleado solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para modificar las credenciales de este empleado.")
		}
	}

	if len(req.Password) < 8 {
		return utils.BadRequest("INVALID_PASSWORD", "La nueva contraseña debe tener al menos 8 caracteres.")
	}

	hash, err := utils.HashPassword(req.Password)
	if err != nil {
		return utils.Internal("Error al procesar la contraseña.", err)
	}

	if err := s.employeeRepo.UpdateCredentials(ctx, s.pool, id, hash); err != nil {
		return utils.Internal("Error al actualizar credenciales.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &current.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "employees",
		EntityID:  &current.ID,
		Action:    "EMPLOYEE_PASSWORD_RESET",
		Reason:    "Restablecimiento de contraseña de empleado",
		IPAddress: ip,
		UserAgent: ua,
	})

	return nil
}

// GetEmployeePermissions devuelve los permisos asignados a un empleado.
func (s *StaffService) GetEmployeePermissions(ctx context.Context, actor *middlewares.ActorContext, id int64) ([]dtos.PermissionResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.employeeRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar empleado.", err)
	}
	if current == nil {
		return nil, utils.NotFound("EMPLOYEE_NOT_FOUND", "El empleado solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para consultar este empleado.")
		}
	}

	return s.permissionRepo.ListByEmployeeID(ctx, s.pool, id)
}

// AssignEmployeePermissions reemplaza los permisos de un empleado y deja el cambio en auditoría.
func (s *StaffService) AssignEmployeePermissions(ctx context.Context, actor *middlewares.ActorContext, id int64, req dtos.AssignEmployeePermissionsRequest, ip, ua string) ([]dtos.PermissionResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.employeeRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar empleado.", err)
	}
	if current == nil {
		return nil, utils.NotFound("EMPLOYEE_NOT_FOUND", "El empleado solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para modificar permisos de este empleado.")
		}
	}

	var adminID *int64
	var empID *int64
	if actor.ActorType == types.ActorAdmin {
		adminID = &actor.ActorID
	} else if actor.ActorType == types.ActorEmployee {
		empID = &actor.ActorID
	}

	if err := s.employeeRepo.AssignPermissions(ctx, s.pool, id, req.PermissionIDs, adminID, empID); err != nil {
		return nil, utils.Internal("Error al asignar permisos.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &current.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "employee_permissions",
		EntityID:  &current.ID,
		Action:    "PERMISSIONS_ASSIGNED",
		Reason:    "Asignación de permisos al empleado",
		IPAddress: ip,
		UserAgent: ua,
	})

	return s.permissionRepo.ListByEmployeeID(ctx, s.pool, id)
}

// UnlockEmployee desbloquea a un empleado que superó los intentos fallidos de ingreso.
func (s *StaffService) UnlockEmployee(ctx context.Context, actor *middlewares.ActorContext, id int64, ip, ua string) (*dtos.UnlockEmployeeResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.employeeRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar empleado.", err)
	}
	if current == nil {
		return nil, utils.NotFound("EMPLOYEE_NOT_FOUND", "El empleado solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para desbloquear este empleado.")
		}
	}

	if err := s.employeeRepo.UnlockEmployee(ctx, s.pool, id); err != nil {
		return nil, utils.Internal("Error al desbloquear empleado.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &current.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "employee_login_attempts",
		EntityID:  &current.ID,
		Action:    "EMPLOYEE_UNLOCKED",
		Reason:    "Reactivación y reseteo de intentos fallidos",
		IPAddress: ip,
		UserAgent: ua,
	})

	return &dtos.UnlockEmployeeResponse{
		EmployeeID: current.ID,
		Email:      current.Email,
		Message:    "Empleado desbloqueado exitosamente.",
		UnlockedAt: time.Now().UTC(),
	}, nil
}

// mapEmployeeToDTO convierte el miembro del personal de la base en la respuesta que sale por la API.
func (s *StaffService) mapEmployeeToDTO(e *repositories.EmployeeEntity, perms []dtos.PermissionResponse) *dtos.EmployeeResponse {
	return &dtos.EmployeeResponse{
		ID:               e.ID,
		CompanyID:        e.CompanyID,
		RoleID:           e.RoleID,
		RoleName:         e.RoleName,
		WarehouseID:      e.WarehouseID,
		WarehouseName:    e.WarehouseName,
		Email:            e.Email,
		FirstName:        e.FirstName,
		LastName:         e.LastName,
		FullName:         e.FullName,
		DocumentType:     e.DocumentType,
		Document:         e.Document,
		Phone:            e.Phone,
		Address:          e.Address,
		PhotoURL:         e.PhotoURL,
		WorkModality:     e.WorkModality,
		EmploymentStatus: e.EmploymentStatus,
		Status:           e.Status,
		LastLoginAt:      e.LastLoginAt,
		CreatedAt:        e.CreatedAt,
		UpdatedAt:        e.UpdatedAt,
		Permissions:      perms,
	}
}
