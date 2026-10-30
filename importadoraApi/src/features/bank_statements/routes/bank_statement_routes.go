package routes

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/features/bank_statements/controllers"

	"github.com/labstack/echo/v4"
)

func RegisterRoutes(e *echo.Echo, authMiddleware *middlewares.AuthMiddleware, ctrl *controllers.BankStatementController) {
	b := e.Group("/bank-statements", authMiddleware.Authenticate())
	{
		b.POST("/upload-pdf", ctrl.UploadPDF)
		b.GET("/records", ctrl.ListRecords)
		b.PATCH("/records/:id/confirm", ctrl.ConfirmRecord)
		b.PATCH("/records/:id/ignore", ctrl.IgnoreRecord)
	}
}

