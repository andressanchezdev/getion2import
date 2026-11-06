package services

// staff_service.go · reglas de negocio de personal (administradores, empleados, roles y permisos): valida permisos, compañía y datos, coordina las transacciones y arma las respuestas
// conecta con: los repositories y dtos de personal (administradores, empleados, roles y permisos); los llama el controller y la conexión llega del contenedor

import (
	"context"
	"strings"

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
	authRepo       *authRepos.AuthRepository
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

// UpdateAdmin actualiza el administrador con las validaciones del negocio.
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

	// Si se inactiva el admin, revocar sus sesiones inmediatamente
	if req.IsActive != nil && !*req.IsActive && s.authRepo != nil {
		if err := s.authRepo.RevokeAllActorSessions(ctx, s.pool, types.ActorAdmin, current.ID); err != nil {
			return nil, utils.Internal("El administrador fue desactivado, pero no se pudieron cerrar sus sesiones.", err)
		}
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

// DeactivateAdmin desactiva el administrador sin borrar su historial.
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
	if err := s.authRepo.RevokeAllActorSessions(ctx, s.pool, types.ActorAdmin, id); err != nil {
		return utils.Internal("El administrador fue desactivado, pero no se pudieron cerrar sus sesiones.", err)
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
