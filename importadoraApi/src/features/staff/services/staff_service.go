package services

import (
	"context"
	"strings"
	"time"

	"importadoraApi/src/core/config"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/staff/dtos"
	"importadoraApi/src/features/staff/repositories"

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
}

func NewStaffService(
	cfg *config.Config,
	pool *pgxpool.Pool,
	adminRepo *repositories.AdminRepository,
	roleRepo *repositories.RoleRepository,
	permissionRepo *repositories.PermissionRepository,
	employeeRepo *repositories.EmployeeRepository,
	auditRepo *authRepos.AuditRepository,
) *StaffService {
	return &StaffService{
		cfg:            cfg,
		pool:           pool,
		adminRepo:      adminRepo,
		roleRepo:       roleRepo,
		permissionRepo: permissionRepo,
		employeeRepo:   employeeRepo,
		auditRepo:      auditRepo,
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

	created, err := s.adminRepo.Create(ctx, s.pool, entity)
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

func (s *StaffService) UpdateAdmin(ctx context.Context, actor *middlewares.ActorContext, id int64, req dtos.UpdateAdminRequest, ip, ua string) (*dtos.AdminResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.adminRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar administrador.", err)
	}
	if current == nil {
		return nil, utils.NotFound("ADMIN_NOT_FOUND", "El administrador solicitado no existe.")
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

	updated, err := s.adminRepo.Update(ctx, s.pool, current)
	if err != nil {
		return nil, utils.Internal("Error al actualizar administrador.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &current.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "admins",
		EntityID:  &current.ID,
		Action:    "ADMIN_UPDATED",
		Reason:    "Actualización de administrador",
		IPAddress: ip,
		UserAgent: ua,
	})

	return s.mapAdminToDTO(updated), nil
}

func (s *StaffService) DeactivateAdmin(ctx context.Context, actor *middlewares.ActorContext, id int64, ip, ua string) error {
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

	if err := s.adminRepo.SoftDelete(ctx, s.pool, id); err != nil {
		return utils.Internal("Error al desactivar administrador.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &current.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "admins",
		EntityID:  &current.ID,
		Action:    "ADMIN_DEACTIVATED",
		Reason:    "Desactivación lógica de administrador",
		IPAddress: ip,
		UserAgent: ua,
	})

	return nil
}

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

// ==========================================
// SERVICIOS PARA PERMISOS
// ==========================================

func (s *StaffService) ListPermissions(ctx context.Context, actor *middlewares.ActorContext) ([]dtos.PermissionResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	return s.permissionRepo.ListAll(ctx, s.pool)
}

// ==========================================
// SERVICIOS PARA EMPLEADOS
// ==========================================

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

	created, err := s.employeeRepo.Create(ctx, s.pool, entity)
	if err != nil {
		return nil, utils.Internal("Error al registrar empleado.", err)
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

func (s *StaffService) UpdateEmployee(ctx context.Context, actor *middlewares.ActorContext, id int64, req dtos.UpdateEmployeeRequest, ip, ua string) (*dtos.EmployeeResponse, error) {
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
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para modificar este empleado.")
		}
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

	updated, err := s.employeeRepo.Update(ctx, s.pool, current)
	if err != nil {
		return nil, utils.Internal("Error al actualizar empleado.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &current.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "employees",
		EntityID:  &current.ID,
		Action:    "EMPLOYEE_UPDATED",
		Reason:    "Actualización de datos del empleado",
		IPAddress: ip,
		UserAgent: ua,
	})

	perms, _ := s.permissionRepo.ListByEmployeeID(ctx, s.pool, current.ID)
	return s.mapEmployeeToDTO(updated, perms), nil
}

func (s *StaffService) DeactivateEmployee(ctx context.Context, actor *middlewares.ActorContext, id int64, ip, ua string) error {
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
			return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para desactivar este empleado.")
		}
	}

	if err := s.employeeRepo.SoftDelete(ctx, s.pool, id); err != nil {
		return utils.Internal("Error al desactivar empleado.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &current.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "employees",
		EntityID:  &current.ID,
		Action:    "EMPLOYEE_DEACTIVATED",
		Reason:    "Eliminación lógica de empleado",
		IPAddress: ip,
		UserAgent: ua,
	})

	return nil
}

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

