package services

// report_service.go · reglas de negocio de reportes: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas
// conecta con: los repositories y dtos de reportes; los llama el controller y la conexión llega del contenedor

import (
	"context"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/reports/dtos"
	"importadoraApi/src/features/reports/repositories"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ReportService struct {
	pool       *pgxpool.Pool
	reportRepo *repositories.ReportRepository
}

// NewReportService crea el servicio con las piezas que necesita para funcionar.
func NewReportService(pool *pgxpool.Pool, reportRepo *repositories.ReportRepository) *ReportService {
	return &ReportService{
		pool:       pool,
		reportRepo: reportRepo,
	}
}

// GetSalesReport devuelve el reporte de ventas, limitado a la compañía del usuario.
func (s *ReportService) GetSalesReport(ctx context.Context, actor *middlewares.ActorContext) (*dtos.SalesDashboardReport, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	companyID := int64(1)
	if actor.CompanyID != nil && *actor.CompanyID > 0 {
		companyID = *actor.CompanyID
	}
	return s.reportRepo.GetSalesReport(ctx, s.pool, companyID)
}

// GetInventoryReport devuelve el reporte de inventario, limitado a la compañía del usuario.
func (s *ReportService) GetInventoryReport(ctx context.Context, actor *middlewares.ActorContext) (*dtos.InventoryDashboardReport, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	companyID := int64(1)
	if actor.CompanyID != nil && *actor.CompanyID > 0 {
		companyID = *actor.CompanyID
	}
	return s.reportRepo.GetInventoryReport(ctx, s.pool, companyID)
}

// GetWalletReport devuelve el reporte de cartera, limitado a la compañía del usuario.
func (s *ReportService) GetWalletReport(ctx context.Context, actor *middlewares.ActorContext) (*dtos.WalletDashboardReport, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	companyID := int64(1)
	if actor.CompanyID != nil && *actor.CompanyID > 0 {
		companyID = *actor.CompanyID
	}
	return s.reportRepo.GetWalletReport(ctx, s.pool, companyID)
}

// GetGeneralReport devuelve el reporte general con ventas del día, traslados, alertas de stock y rotación.
func (s *ReportService) GetGeneralReport(ctx context.Context, actor *middlewares.ActorContext) (*dtos.GeneralDashboardReport, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	companyID := int64(1)
	if actor.CompanyID != nil && *actor.CompanyID > 0 {
		companyID = *actor.CompanyID
	}
	return s.reportRepo.GetGeneralReport(ctx, s.pool, companyID)
}

