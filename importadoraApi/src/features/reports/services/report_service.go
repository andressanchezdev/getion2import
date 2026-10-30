package services

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

func NewReportService(pool *pgxpool.Pool, reportRepo *repositories.ReportRepository) *ReportService {
	return &ReportService{
		pool:       pool,
		reportRepo: reportRepo,
	}
}

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

