package routes

// staff_routes.go · rutas HTTP de personal (administradores, empleados, roles y permisos) y los roles o permisos que exige cada una
// conecta con: los controllers de personal (administradores, empleados, roles y permisos) y core/middlewares (autenticación y permisos); los arma core/bootstrap

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/features/staff/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes registra los endpoints del módulo de staff (admins, roles, permisos y empleados)
func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.StaffController) {
	// Grupo /admins
	adm := e.Group("/admins", authMiddleware.Authenticate())
	{
		adm.GET("", ctrl.ListAdmins, authMiddleware.RequireActors(types.ActorSuperadmin, types.ActorAdmin))
		adm.GET("/:id", ctrl.GetAdminByID, authMiddleware.RequireActors(types.ActorSuperadmin, types.ActorAdmin))
		adm.POST("", ctrl.CreateAdmin, authMiddleware.RequireActors(types.ActorSuperadmin))
		adm.PUT("/:id", ctrl.UpdateAdmin, authMiddleware.RequireActors(types.ActorSuperadmin))
		adm.DELETE("/:id", ctrl.DeactivateAdmin, authMiddleware.RequireActors(types.ActorSuperadmin))
	}

	// Grupo /roles
	roles := e.Group("/roles", authMiddleware.Authenticate())
	{
		roles.GET("", ctrl.ListRoles, authMiddleware.RequireAnyPermission("roles:view", "employees:view"))
		roles.GET("/:id", ctrl.GetRoleByID, authMiddleware.RequireAnyPermission("roles:view_detail", "employees:view"))
		roles.POST("", ctrl.CreateRole, authMiddleware.RequirePermission("roles", "create"))
		roles.PUT("/:id", ctrl.UpdateRole, authMiddleware.RequirePermission("roles", "edit"))
		roles.DELETE("/:id", ctrl.DeactivateRole, authMiddleware.RequirePermission("roles", "delete"))
	}

	// Grupo /permissions
	perms := e.Group("/permissions", authMiddleware.Authenticate())
	{
		perms.GET("", ctrl.ListPermissions, authMiddleware.RequireAnyPermission("roles:view", "employees:view"))
	}

	// Grupo /employees
	emp := e.Group("/employees", authMiddleware.Authenticate())
	{
		emp.GET("", ctrl.ListEmployees, authMiddleware.RequirePermission("employees", "view"))
		emp.GET("/salespersons", ctrl.ListSalespersons, authMiddleware.RequireAnyPermission("employees:view", "orders:view", "quotations:view", "reports:view"))
		emp.GET("/:id", ctrl.GetEmployeeByID, authMiddleware.RequirePermission("employees", "view_detail"))
		emp.POST("", ctrl.CreateEmployee, authMiddleware.RequirePermission("employees", "create"))
		emp.PUT("/:id", ctrl.UpdateEmployee, authMiddleware.RequirePermission("employees", "edit"))
		emp.DELETE("/:id", ctrl.DeactivateEmployee, authMiddleware.RequirePermission("employees", "delete"))

		// Sub-recursos de credenciales y permisos
		emp.PUT("/:id/credentials", ctrl.UpdateEmployeeCredentials, authMiddleware.RequirePermission("employees", "edit"))
		emp.GET("/:id/permissions", ctrl.GetEmployeePermissions, authMiddleware.RequireAnyPermission("employees:view_detail", "roles:view"))
		emp.PUT("/:id/permissions", ctrl.AssignEmployeePermissions, authMiddleware.RequirePermission("roles", "edit"))
	}
	// ojo: el alias /staff se retiró (8.2-7): exponía la lista y el detalle de empleados sin employees:view; el front nunca lo usó
}
