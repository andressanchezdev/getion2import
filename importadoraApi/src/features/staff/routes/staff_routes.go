package routes

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/staff/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes registra los endpoints del módulo de staff (admins, roles, permisos y empleados)
func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.StaffController) {
	// Grupo /admins
	adm := e.Group("/admins", authMiddleware.Authenticate())
	{
		adm.GET("", ctrl.ListAdmins)
		adm.GET("/:id", ctrl.GetAdminByID)
		adm.POST("", ctrl.CreateAdmin)
		adm.PUT("/:id", ctrl.UpdateAdmin)
		adm.DELETE("/:id", ctrl.DeactivateAdmin)
	}

	// Grupo /roles
	roles := e.Group("/roles", authMiddleware.Authenticate())
	{
		roles.GET("", ctrl.ListRoles)
		roles.GET("/:id", ctrl.GetRoleByID)
		roles.POST("", ctrl.CreateRole)
		roles.PUT("/:id", ctrl.UpdateRole)
		roles.DELETE("/:id", ctrl.DeactivateRole)
	}

	// Grupo /permissions
	perms := e.Group("/permissions", authMiddleware.Authenticate())
	{
		perms.GET("", ctrl.ListPermissions)
	}

	// Grupo /employees
	emp := e.Group("/employees", authMiddleware.Authenticate())
	{
		emp.GET("", ctrl.ListEmployees)
		emp.GET("/salespersons", ctrl.ListSalespersons)
		emp.GET("/:id", ctrl.GetEmployeeByID)
		emp.POST("", ctrl.CreateEmployee)
		emp.PUT("/:id", ctrl.UpdateEmployee)
		emp.DELETE("/:id", ctrl.DeactivateEmployee)

		// Sub-recursos de credenciales, permisos y desbloqueo
		emp.PUT("/:id/credentials", ctrl.UpdateEmployeeCredentials)
		emp.GET("/:id/permissions", ctrl.GetEmployeePermissions)
		emp.PUT("/:id/permissions", ctrl.AssignEmployeePermissions)
		emp.POST("/:id/unlock", ctrl.UnlockEmployee)
	}
}

