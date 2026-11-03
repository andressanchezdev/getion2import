package routes

// company_routes.go · rutas HTTP de compañías y los roles o permisos que exige cada una
// conecta con: los controllers de compañías y core/middlewares (autenticación y permisos); los arma core/bootstrap

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/features/companies/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes registra los endpoints del módulo de compañías
func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.CompanyController) {
	group := e.Group("/companies", authMiddleware.Authenticate())
	{
		// 1. CREATE: POST /companies (Exclusivo Superadmin)
		group.POST("", ctrl.Create, authMiddleware.RequireActors(types.ActorSuperadmin))

		// 2. GET: GET /companies (Listado paginado)
		group.GET("", ctrl.Get)

		// 3. SEARCH: GET /companies/search (Búsqueda por texto q=...)
		group.GET("/search", ctrl.Search)

		// 4. SEARCH BY ID: GET /companies/:id (Detalle por ID)
		group.GET("/:id", ctrl.GetByID)

		// 5. PUT: PUT /companies/:id (Actualizar datos corporativos)
		group.PUT("/:id", ctrl.Update, authMiddleware.RequireActors(types.ActorSuperadmin, types.ActorAdmin))

		// 6. DELETE: DELETE /companies/:id (Retiro de la operación, exclusivo Superadmin)
		group.DELETE("/:id", ctrl.Delete, authMiddleware.RequireActors(types.ActorSuperadmin))
	}
}
