package repositories

// report_repo.go · acceso a la base de reportes: aquí vive el SQL; cada método recibe la conexión o la transacción
// conecta con: core/db (DBExecutor) y los dtos de reportes; los usan los services de reportes

import (
	"context"

	"importadoraApi/src/core/db"
	"importadoraApi/src/features/reports/dtos"
)

type ReportRepository struct{}

// NewReportRepository crea el repositorio; no guarda estado, cada método recibe la conexión o transacción.
func NewReportRepository() *ReportRepository {
	return &ReportRepository{}
}

// GetSalesReport arma el reporte de ventas del periodo (totales por día, método y estado).
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

// GetInventoryReport arma el reporte de inventario (existencias, valor y productos en bajo stock).
func (r *ReportRepository) GetInventoryReport(ctx context.Context, q db.DBExecutor, companyID int64) (*dtos.InventoryDashboardReport, error) {
	const sql = `
		SELECT
			COUNT(DISTINCT s.product_id) AS total_skus,
			COALESCE(SUM(s.available), 0) AS physical_units,
			COALESCE(SUM(s.available - s.reserved), 0) AS available_units,
			COALESCE(SUM(s.reserved), 0) AS reserved_units,
			COALESCE(SUM(s.available * p.last_cost), 0) AS valuation_cost
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

// GetWalletReport arma el reporte de cartera (deuda total y por cliente).
func (r *ReportRepository) GetWalletReport(ctx context.Context, q db.DBExecutor, companyID int64) (*dtos.WalletDashboardReport, error) {
	const sql = `
		SELECT
			COUNT(*) FILTER (WHERE credit_enabled) AS total_custs,
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

// GetGeneralReport obtiene métricas integradas: ventas del día, traslados del día, productos bajo stock y rotación.
func (r *ReportRepository) GetGeneralReport(ctx context.Context, q db.DBExecutor, companyID int64) (*dtos.GeneralDashboardReport, error) {
	rpt := &dtos.GeneralDashboardReport{
		TopSellingProducts:   make([]dtos.TopProductDto, 0),
		LowStockProducts:     make([]dtos.LowStockProductDto, 0),
		HighRotationProducts: make([]dtos.TopProductDto, 0),
		LowRotationProducts:  make([]dtos.DeadStockProductDto, 0),
	}

	// 1. Ventas del día
	const salesSQL = `
		SELECT
			COUNT(*),
			COALESCE(SUM(total), 0),
			COALESCE(COUNT(*) FILTER (WHERE status = 'completed'), 0)
		FROM sales
		WHERE company_id = $1 AND status <> 'cancelled' AND created_at >= CURRENT_DATE
	`
	_ = q.QueryRow(ctx, salesSQL, companyID).Scan(&rpt.TodaySalesCount, &rpt.TodayRevenue, &rpt.TodayCompleted)

	// 1b. Efectivo, transferencias y créditos del día
	const paymentsSQL = `
		SELECT
			COALESCE(SUM(CASE WHEN method = 'cash' THEN amount ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN method = 'transfer' THEN amount ELSE 0 END), 0)
		FROM payments
		WHERE company_id = $1 AND status = 'verified' AND created_at >= CURRENT_DATE
	`
	_ = q.QueryRow(ctx, paymentsSQL, companyID).Scan(&rpt.TodayCash, &rpt.TodayTransfer)

	const creditSQL = `
		SELECT COALESCE(SUM(total), 0)
		FROM sales
		WHERE company_id = $1 AND payment_method = 'credit' AND status <> 'cancelled' AND created_at >= CURRENT_DATE
	`
	_ = q.QueryRow(ctx, creditSQL, companyID).Scan(&rpt.TodayCredit)

	// 2. Traslados del día
	const transfersSQL = `
		SELECT
			COUNT(*),
			COALESCE(COUNT(*) FILTER (WHERE status IN ('received', 'completed', 'with_novelty')), 0),
			COALESCE(COUNT(*) FILTER (WHERE status = 'in_transit'), 0),
			COALESCE(COUNT(*) FILTER (WHERE status = 'pending'), 0)
		FROM transfers
		WHERE company_id = $1 AND created_at >= CURRENT_DATE
	`
	_ = q.QueryRow(ctx, transfersSQL, companyID).Scan(
		&rpt.TodayTransfers.TotalCount,
		&rpt.TodayTransfers.InCount,
		&rpt.TodayTransfers.OutCount,
		&rpt.TodayTransfers.PendingCount,
	)

	// 2b. Unidades físicas afectadas por traslados hoy
	const physicalUnitsSQL = `
		SELECT COALESCE(SUM(ti.quantity), 0)
		FROM details_transfer ti
		JOIN transfers t ON t.id = ti.transfer_id
		WHERE t.company_id = $1 AND t.created_at >= CURRENT_DATE
	`
	_ = q.QueryRow(ctx, physicalUnitsSQL, companyID).Scan(&rpt.TodayPhysicalUnitsMoved)

	// 3. Productos más vendidos / alta rotación
	const topSQL = `
		SELECT
			p.id, p.code, p.name,
			COALESCE(SUM(si.quantity), 0) AS units_sold,
			COALESCE(SUM(si.line_total), 0) AS total_amount
		FROM sale_items si
		JOIN sales s ON s.id = si.sale_id
		JOIN products p ON p.id = si.product_id
		WHERE s.company_id = $1 AND s.status != 'cancelled'
		GROUP BY p.id, p.code, p.name
		ORDER BY units_sold DESC
		LIMIT 5
	`
	if rows, err := q.Query(ctx, topSQL, companyID); err == nil {
		defer rows.Close()
		for rows.Next() {
			var tp dtos.TopProductDto
			if err := rows.Scan(&tp.ProductID, &tp.Code, &tp.Name, &tp.UnitsSold, &tp.TotalAmount); err == nil {
				rpt.TopSellingProducts = append(rpt.TopSellingProducts, tp)
				rpt.HighRotationProducts = append(rpt.HighRotationProducts, tp)
			}
		}
	}

	// 4. Productos con stock bajo (<= 5 unidades disponibles)
	const lowStockSQL = `
		SELECT
			p.id, p.code, p.name,
			COALESCE(SUM(st.available), 0)::INT AS available,
			COALESCE(c.name, 'Repuestos Generales') AS category
		FROM products p
		LEFT JOIN stock st ON st.product_id = p.id
		LEFT JOIN categories c ON c.id = p.category_id
		WHERE p.company_id = $1 AND p.status = 'active'
		GROUP BY p.id, p.code, p.name, c.name
		HAVING COALESCE(SUM(st.available), 0) <= 5
		ORDER BY available ASC
		LIMIT 10
	`
	if rows, err := q.Query(ctx, lowStockSQL, companyID); err == nil {
		defer rows.Close()
		for rows.Next() {
			var lp dtos.LowStockProductDto
			lp.MinStock = 5
			if err := rows.Scan(&lp.ID, &lp.Code, &lp.Name, &lp.Available, &lp.Category); err == nil {
				rpt.LowStockProducts = append(rpt.LowStockProducts, lp)
			}
		}
		rpt.LowStockCount = len(rpt.LowStockProducts)
	}

	// 5. Productos con baja rotación / sin movimiento (con stock pero sin ventas recientes)
	const deadStockSQL = `
		SELECT
			p.id, p.code, p.name,
			COALESCE(SUM(st.available), 0)::INT AS stock,
			p.last_cost,
			COALESCE(EXTRACT(DAY FROM CURRENT_TIMESTAMP - MAX(s.created_at))::INT, 90) AS days_without_sale
		FROM products p
		JOIN stock st ON st.product_id = p.id
		LEFT JOIN sale_items si ON si.product_id = p.id
		LEFT JOIN sales s ON s.id = si.sale_id AND s.status != 'cancelled'
		WHERE p.company_id = $1 AND p.status = 'active'
		GROUP BY p.id, p.code, p.name, p.last_cost
		HAVING COALESCE(SUM(st.available), 0) > 0
		ORDER BY COALESCE(MAX(s.created_at), '2000-01-01'::timestamptz) ASC
		LIMIT 10
	`
	if rows, err := q.Query(ctx, deadStockSQL, companyID); err == nil {
		defer rows.Close()
		for rows.Next() {
			var dp dtos.DeadStockProductDto
			if err := rows.Scan(&dp.ProductID, &dp.Code, &dp.Name, &dp.Stock, &dp.LastCost, &dp.DaysWithoutSale); err == nil {
				rpt.LowRotationProducts = append(rpt.LowRotationProducts, dp)
			}
		}
	}

	return rpt, nil
}

