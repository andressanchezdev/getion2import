package services

// staff_employee_service · empleados: datos, credenciales, permisos asignados y desbloqueo
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

// ListEmployees lista los empleados según los filtros y lo que el usuario puede ver.
func (s *StaffService) ListEmployees(ctx context.Context, actor *middlewares.ActorContext, filter dtos.EmployeeFilterQuery) ([]dtos.EmployeeResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		filter.CompanyID = actor.CompanyID
	}

	entities, total, err := s.employeeRepo.List(ctx, s.pool, filter)
	if err != nil {
		return nil, nil, utils.Internal("Error al consultar empleados.", err)
	}

	meta := utils.BuildMeta(filter.Page, filter.PageSize, total)
	result := make([]dtos.EmployeeResponse, 0, len(entities))
	for i := range entities {
		result = append(result, *s.mapEmployeeToDTO(&entities[i], nil))
	}

	return result, &meta, nil
}

// ListSalespersons lista a los empleados que pueden vender, de la compañía del usuario.
func (s *StaffService) ListSalespersons(ctx context.Context, actor *middlewares.ActorContext) ([]dtos.SalespersonResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	companyID := int64(1)
	if actor.CompanyID != nil && *actor.CompanyID > 0 {
		companyID = *actor.CompanyID
	}

	entities, err := s.employeeRepo.ListSalespersons(ctx, s.pool, companyID)
	if err != nil {
		return nil, utils.Internal("Error al consultar vendedores.", err)
	}

	result := make([]dtos.SalespersonResponse, 0, len(entities))
	for i := range entities {
		result = append(result, dtos.SalespersonResponse{
			ID:            entities[i].ID,
			FullName:      entities[i].FullName,
			Email:         entities[i].Email,
			Phone:         entities[i].Phone,
			RoleName:      entities[i].RoleName,
			WarehouseID:   entities[i].WarehouseID,
			WarehouseName: entities[i].WarehouseName,
		})
	}
	return result, nil
}

// GetEmployeeByID devuelve el empleado por su id, validando que sea de la compañía del usuario.
func (s *StaffService) GetEmployeeByID(ctx context.Context, actor *middlewares.ActorContext, id int64) (*dtos.EmployeeResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	entity, err := s.employeeRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar empleado.", err)
	}
	if entity == nil {
		return nil, utils.NotFound("EMPLOYEE_NOT_FOUND", "El empleado solicitado no existe o fue eliminado.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != entity.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para consultar este empleado.")
		}
	}

	// Obtener permisos asignados al empleado
	perms, err := s.permissionRepo.ListByEmployeeID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar permisos del empleado.", err)
	}

	return s.mapEmployeeToDTO(entity, perms), nil
}

// CreateEmployee crea el empleado con las validaciones del negocio.
func (s *StaffService) CreateEmployee(ctx context.Context, actor *middlewares.ActorContext, req dtos.CreateEmployeeRequest, ip, ua string) (*dtos.EmployeeResponse, error) {
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

	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email == "" {
		return nil, utils.BadRequest("INVALID_EMAIL", "El correo electrónico es requerido.")
	}
	if len(req.Password) < 8 {
		return nil, utils.BadRequest("INVALID_PASSWORD", "La contraseña debe tener al menos 8 caracteres.")
	}

	// Verificar unicidad de correo
	existing, err := s.employeeRepo.FindByEmail(ctx, s.pool, email)
	if err != nil {
		return nil, utils.Internal("Error al verificar correo del empleado.", err)
	}
	if existing != nil {
		return nil, utils.Conflict("EMAIL_EXISTS", "Ya existe un empleado con este correo electrónico.")
	}

	// Validar que el rol exista y pertenezca a la empresa
	role, err := s.roleRepo.FindByID(ctx, s.pool, req.RoleID)
	if err != nil {
		return nil, utils.Internal("Error al validar rol.", err)
	}
	if role == nil || role.CompanyID != *companyID {
		return nil, utils.BadRequest("INVALID_ROLE", "El rol especificado no existe o no pertenece a la compañía.")
	}

	passwordHash, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, utils.Internal("Error al procesar contraseña.", err)
	}

	docType := req.DocumentType
	if docType == "" {
		docType = types.DocCC
	}
	modality := req.WorkModality
	if modality == "" {
		modality = types.ModalityOnsite
	}
	empStatus := req.EmploymentStatus
	if empStatus == "" {
		empStatus = types.EmploymentActive
	}

	entity := &repositories.EmployeeEntity{
		CompanyID:        *companyID,
		RoleID:           req.RoleID,
		RoleName:         role.Name,
		WarehouseID:      req.WarehouseID,
		Email:            email,
		PasswordHash:     passwordHash,
		FirstName:        strings.TrimSpace(req.FirstName),
		LastName:         strings.TrimSpace(req.LastName),
		DocumentType:     docType,
		Document:         req.Document,
		Phone:            req.Phone,
		Address:          req.Address,
		PhotoURL:         req.PhotoURL,
		WorkModality:     modality,
		EmploymentStatus: empStatus,
		Status:           types.EmployeeActive,
	}

	// la creación y su evento van en la misma transacción: nadie recibe el aviso de un registro que no se guardó
	created, err := db.WithTxValue(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) (*repositories.EmployeeEntity, error) {
		row, err := s.employeeRepo.Create(ctx, tx, entity)
		if err != nil {
			return nil, err
		}
		s.events.Record(ctx, events.NewEntityCreated(row.CompanyID, nil, events.EntityRef{Kind: events.KindEmployee, ID: row.ID, Version: row.UpdatedAt}, s.mapEmployeeToDTO(row, nil)))
		return row, nil
	})
	if err != nil {
		return nil, utils.NormalizeDBError(err, "")
	}

	// Asignar permisos iniciales si se proporcionaron
	if len(req.InitialPermissions) > 0 {
		var adminID *int64
		var empID *int64
		if actor.ActorType == types.ActorAdmin {
			adminID = &actor.ActorID
		} else if actor.ActorType == types.ActorEmployee {
			empID = &actor.ActorID
		}
		_ = s.employeeRepo.AssignPermissions(ctx, s.pool, created.ID, req.InitialPermissions, adminID, empID)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: companyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "employees",
		EntityID:  &created.ID,
		Action:    "EMPLOYEE_CREATED",
		Reason:    "Creación de empleado operativo",
		IPAddress: ip,
		UserAgent: ua,
	})

	perms, _ := s.permissionRepo.ListByEmployeeID(ctx, s.pool, created.ID)
	return s.mapEmployeeToDTO(created, perms), nil
}

// UpdateEmployee actualiza el empleado con las validaciones del negocio.
func (s *StaffService) UpdateEmployee(ctx context.Context, actor *middlewares.ActorContext, id int64, req dtos.UpdateEmployeeRequest, ip, ua string) (*dtos.EmployeeResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.employeeRepo.FindByID(ctx, s.pool, id)
	// foto del registro antes de editarlo: de aquí sale changedFields
	beforeSnap := events.Snapshot(current)
	if err != nil {
		return nil, utils.Internal("Error al consultar empleado.", err)
	}
	if current == nil {
		return nil, utils.NotFound("EMPLOYEE_NOT_FOUND", "El empleado solicitado no existe.")
	}
	if err := utils.ValidateExpectedVersion(current.UpdatedAt, req.ExpectedVersion); err != nil {
		return nil, err
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para modificar este empleado.")
		}
	}

	prevStatus := employeeEffectiveStatus(current)
	inactivating := (req.Status != nil && *req.Status != types.EmployeeActive) ||
		(req.EmploymentStatus != nil && *req.EmploymentStatus != types.EmploymentActive)
	auditReason := "Actualización de datos del empleado"
	var reasonPtr *string
	if inactivating {
		r, rerr := utils.ValidateReason(req.Reason)
		if rerr != nil {
			return nil, rerr
		}
		auditReason = r
		reasonPtr = &r
	}

	if req.RoleID != nil {
		role, err := s.roleRepo.FindByID(ctx, s.pool, *req.RoleID)
		if err != nil {
			return nil, utils.Internal("Error al verificar rol.", err)
		}
		if role == nil || role.CompanyID != current.CompanyID {
			return nil, utils.BadRequest("INVALID_ROLE", "El rol seleccionado no pertenece a la misma compañía.")
		}
		current.RoleID = *req.RoleID
		current.RoleName = role.Name
	}

	if req.WarehouseID != nil {
		current.WarehouseID = req.WarehouseID
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
	if req.Address != nil {
		current.Address = req.Address
	}
	if req.PhotoURL != nil {
		current.PhotoURL = req.PhotoURL
	}
	if req.WorkModality != nil {
		current.WorkModality = *req.WorkModality
	}
	if req.EmploymentStatus != nil {
		current.EmploymentStatus = *req.EmploymentStatus
	}
	if req.Status != nil {
		current.Status = *req.Status
	}

	var resp *dtos.EmployeeResponse
	err = db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		updated, err := s.employeeRepo.Update(ctx, tx, current)
		if err != nil {
			return utils.Internal("Error al actualizar empleado.", err)
		}
		if inactivating && s.authRepo != nil {
			if err := s.authRepo.RevokeAllActorSessions(ctx, tx, types.ActorEmployee, current.ID); err != nil {
				return utils.Internal("El empleado fue actualizado, pero no se pudieron cerrar sus sesiones.", err)
			}
			s.events.Record(ctx, events.NewPersonal(
				events.SessionRevoked,
				&current.CompanyID,
				string(types.ActorEmployee),
				current.ID,
				events.SessionRevokedData{Reason: "account_inactive"},
			))
		}

		_ = s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
			CompanyID: &current.CompanyID,
			ActorType: actor.ActorType,
			ActorID:   actor.ActorID,
			Entity:    "employees",
			EntityID:  &current.ID,
			Action:    "EMPLOYEE_UPDATED",
			Reason:    auditReason,
			IPAddress: ip,
			UserAgent: ua,
		})

		perms, _ := s.permissionRepo.ListByEmployeeID(ctx, tx, current.ID)
		resp = s.mapEmployeeToDTO(updated, perms)

		newStatus := employeeEffectiveStatus(updated)
		if prevStatus != newStatus {
			s.events.Record(ctx, events.NewEntityStatus(
				current.CompanyID,
				nil,
				events.EntityRef{Kind: events.KindEmployee, ID: updated.ID, Version: updated.UpdatedAt},
				prevStatus,
				newStatus,
				reasonPtr,
				resp,
			))
		} else {
			// edición sin cambio de estado: viaja la fila ya guardada para que las tablas abiertas se actualicen sin pedirla
			s.events.Record(ctx, events.NewEntityUpdated(current.CompanyID, nil, events.EntityRef{Kind: events.KindEmployee, ID: updated.ID, Version: updated.UpdatedAt}, resp, events.ChangedFields(beforeSnap, updated)))
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return resp, nil
}

// DeactivateEmployee desactiva el empleado sin borrar su historial.
func (s *StaffService) DeactivateEmployee(ctx context.Context, actor *middlewares.ActorContext, id int64, reason, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	reason, verr := utils.ValidateReason(reason)
	if verr != nil {
		return verr
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
			return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para desactivar este empleado.")
		}
	}

	prevStatus := employeeEffectiveStatus(current)
	return db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		if err := s.employeeRepo.SoftDelete(ctx, tx, id); err != nil {
			return utils.Internal("Error al desactivar empleado.", err)
		}
		if s.authRepo != nil {
			if err := s.authRepo.RevokeAllActorSessions(ctx, tx, types.ActorEmployee, id); err != nil {
				return utils.Internal("El empleado fue desactivado, pero no se pudieron cerrar sus sesiones.", err)
			}
			s.events.Record(ctx, events.NewPersonal(
				events.SessionRevoked,
				&current.CompanyID,
				string(types.ActorEmployee),
				id,
				events.SessionRevokedData{Reason: "account_inactive"},
			))
		}

		_ = s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
			CompanyID: &current.CompanyID,
			ActorType: actor.ActorType,
			ActorID:   actor.ActorID,
			Entity:    "employees",
			EntityID:  &current.ID,
			Action:    "EMPLOYEE_DEACTIVATED",
			Reason:    reason,
			IPAddress: ip,
			UserAgent: ua,
		})

		perms, _ := s.permissionRepo.ListByEmployeeID(ctx, tx, id)
		now := time.Now().UTC()
		current.Status = types.EmployeeInactive
		current.EmploymentStatus = types.EmploymentRetired
		current.UpdatedAt = now
		s.events.Record(ctx, events.NewEntityStatus(
			current.CompanyID,
			nil,
			events.EntityRef{Kind: events.KindEmployee, ID: id, Version: now},
			prevStatus,
			"inactive",
			&reason,
			s.mapEmployeeToDTO(current, perms),
		))
		return nil
	})
}

func employeeEffectiveStatus(e *repositories.EmployeeEntity) string {
	if e.Status != types.EmployeeActive {
		return string(e.Status)
	}
	if e.EmploymentStatus != types.EmploymentActive {
		return "inactive"
	}
	return "active"
}
