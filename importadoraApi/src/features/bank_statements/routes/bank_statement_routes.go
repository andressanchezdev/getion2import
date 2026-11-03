package routes

// bank_statement_routes.go · rutas HTTP de extractos bancarios y los roles o permisos que exige cada una
// conecta con: los controllers de extractos bancarios y core/middlewares (autenticación y permisos); los arma core/bootstrap

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/bank_statements/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes registra las rutas del módulo y los roles o permisos que exige cada una.
func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.BankStatementController) {
	b := e.Group("/bank-statements", authMiddleware.Authenticate())
	{
		b.POST("/upload-pdf", ctrl.UploadPDF, authMiddleware.RequirePermission("payments", "create"))
		b.GET("/records", ctrl.ListRecords, authMiddleware.RequirePermission("payments", "view"))
		b.PATCH("/records/:id/confirm", ctrl.ConfirmRecord, authMiddleware.RequirePermission("payments", "edit"))
		b.PATCH("/records/:id/ignore", ctrl.IgnoreRecord, authMiddleware.RequirePermission("payments", "edit"))
	}
}
