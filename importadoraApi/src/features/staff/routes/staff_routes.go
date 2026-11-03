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
		roles.GET("", ctrl.ListRoles)
		roles.GET("/:id", ctrl.GetRoleByID)
		roles.POST("", ctrl.CreateRole, authMiddleware.RequirePermission("roles", "create"))
		roles.PUT("/:id", ctrl.UpdateRole, authMiddleware.RequirePermission("roles", "edit"))
		roles.DELETE("/:id", ctrl.DeactivateRole, authMiddleware.RequirePermission("roles", "delete"))
	}

	// Grupo /permissions
	perms := e.Group("/permissions", authMiddleware.Authenticate())
	{
		perms.GET("", ctrl.ListPermissions)
	}

	// Grupo /employees
	emp := e.Group("/employees", authMiddleware.Authenticate())
	{
		emp.GET("", ctrl.ListEmployees, authMiddleware.RequirePermission("employees", "view"))
		emp.GET("/salespersons", ctrl.ListSalespersons)
		emp.GET("/:id", ctrl.GetEmployeeByID, authMiddleware.RequirePermission("employees", "view"))
		emp.POST("", ctrl.CreateEmployee, authMiddleware.RequirePermission("employees", "create"))
		emp.PUT("/:id", ctrl.UpdateEmployee, authMiddleware.RequirePermission("employees", "edit"))
		emp.DELETE("/:id", ctrl.DeactivateEmployee, authMiddleware.RequirePermission("employees", "delete"))

		// Sub-recursos de credenciales, permisos y desbloqueo
		emp.PUT("/:id/credentials", ctrl.UpdateEmployeeCredentials, authMiddleware.RequirePermission("employees", "edit"))
		emp.GET("/:id/permissions", ctrl.GetEmployeePermissions, authMiddleware.RequirePermission("employees", "view"))
		emp.PUT("/:id/permissions", ctrl.AssignEmployeePermissions, authMiddleware.RequirePermission("roles", "edit"))
		emp.POST("/:id/unlock", ctrl.UnlockEmployee, authMiddleware.RequirePermission("employees", "edit"))
	}

	// Grupo /staff (alias para máxima compatibilidad con frontend y módulos administrativos)
	staff := e.Group("/staff", authMiddleware.Authenticate())
	{
		staff.GET("", ctrl.ListEmployees)
		staff.GET("/:id", ctrl.GetEmployeeByID)
		staff.PUT("/:id", ctrl.UpdateEmployee, authMiddleware.RequirePermission("employees", "edit"))
	}
}
