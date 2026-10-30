package repositories

import (
	"context"

	"importadoraApi/src/core/db"
	"importadoraApi/src/features/reports/dtos"
)

type ReportRepository struct{}

func NewReportRepository() *ReportRepository {
	return &ReportRepository{}
}

func (r *ReportRepository) GetSalesReport(ctx context.Context, q db.DBExecutor, companyID int64) (*dtos.SalesDashboardReport, error) {
	const sql = `
		SELECT
			COUNT(*) AS total_count,
			COALESCE(SUM(total), 0) AS total_revenue,
			COALESCE(AVG(total), 0) AS avg_ticket,
			COALESCE(SUM(paid_total), 0) AS total_paid,
			COALESCE(SUM(total - paid_total), 0) AS total_pending,
			COALESCE(COUNT(*) FILTER (WHERE status = 'completed'), 0) AS completed_sales,
			COALESCE(COUNT(*) FILTER (WHERE status = 'open'), 0) AS open_sales,
			COALESCE(COUNT(*) FILTER (WHERE status = 'cancelled'), 0) AS cancelled_sales
		FROM sales
		WHERE company_id = $1
	`
	var rpt dtos.SalesDashboardReport
	err := q.QueryRow(ctx, sql, companyID).Scan(
		&rpt.TotalSalesCount,
		&rpt.TotalRevenue,
		&rpt.AverageTicket,
		&rpt.TotalPaid,
		&rpt.TotalPending,
		&rpt.CompletedSales,
		&rpt.OpenSales,
		&rpt.CancelledSales,
	)
	if err != nil {
		return nil, err
	}
	return &rpt, nil
}

func (r *ReportRepository) GetInventoryReport(ctx context.Context, q db.DBExecutor, companyID int64) (*dtos.InventoryDashboardReport, error) {
	const sql = `
		SELECT
			COUNT(DISTINCT s.product_id) AS total_skus,
			COALESCE(SUM(s.available + s.reserved), 0) AS physical_units,
			COALESCE(SUM(s.available), 0) AS available_units,
			COALESCE(SUM(s.reserved), 0) AS reserved_units,
			COALESCE(SUM((s.available + s.reserved) * p.last_cost), 0) AS valuation_cost
		FROM stock s
		JOIN products p ON p.id = s.product_id
		WHERE s.company_id = $1
	`
	var rpt dtos.InventoryDashboardReport
	err := q.QueryRow(ctx, sql, companyID).Scan(
		&rpt.TotalSKUs,
		&rpt.TotalPhysicalUnits,
		&rpt.TotalAvailableUnits,
		&rpt.TotalReservedUnits,
		&rpt.TotalValuationCost,
	)
	if err != nil {
		return nil, err
	}
	return &rpt, nil
}

func (r *ReportRepository) GetWalletReport(ctx context.Context, q db.DBExecutor, companyID int64) (*dtos.WalletDashboardReport, error) {
	const sql = `
		SELECT
			COUNT(*) AS total_custs,
			COALESCE(SUM(CASE WHEN credit_balance < 0 THEN ABS(credit_balance) ELSE 0 END), 0) AS outstanding_debt,
			COALESCE(SUM(CASE WHEN credit_balance > 0 THEN credit_balance ELSE 0 END), 0) AS store_credit
		FROM v_customer_credit_summary
		WHERE company_id = $1
	`
	var rpt dtos.WalletDashboardReport
	err := q.QueryRow(ctx, sql, companyID).Scan(
		&rpt.TotalCustomersWithCredit,
		&rpt.TotalOutstandingDebt,
		&rpt.TotalStoreCreditBalance,
	)
	if err != nil {
		return nil, err
	}
	return &rpt, nil
}

