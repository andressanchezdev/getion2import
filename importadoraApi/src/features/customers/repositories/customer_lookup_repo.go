package repositories

// customer_lookup_repo · listas cortas del cliente: selector y resumen de crédito
// conecta con: CustomerRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en customer_repo.go)

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/customers/dtos"

	"github.com/jackc/pgx/v5"
)

// ListSelector trae la lista corta de clientes (id, nombre y documento) para los selectores, con búsqueda opcional.
func (r *CustomerRepository) ListSelector(ctx context.Context, q db.DBExecutor, companyID int64, search string) ([]dtos.CustomerSelectorResponse, error) {
	items, err := r.listSelector(ctx, q, companyID, search, false)
	if err == nil && len(items) == 0 && strings.TrimSpace(search) != "" {
		return r.listSelector(ctx, q, companyID, search, true)
	}
	return items, err
}

func (r *CustomerRepository) listSelector(ctx context.Context, q db.DBExecutor, companyID int64, search string, fuzzy bool) ([]dtos.CustomerSelectorResponse, error) {
	where := []string{"c.company_id = $1", "c.deleted_at IS NULL", "c.status = 'active'"}
	args := []interface{}{companyID}
	argIdx := 2

	if strings.TrimSpace(search) != "" {
		where = append(where, fmt.Sprintf("(c.document ILIKE $%d OR c.name ILIKE $%d OR c.trade_name ILIKE $%d)%s", argIdx, argIdx, argIdx, utils.FuzzyOr(fuzzy, argIdx, "c.name")))
		args = append(args, "%"+strings.TrimSpace(search)+"%")
		argIdx++
	}

	whereClause := "WHERE " + strings.Join(where, " AND ")
	sql := fmt.Sprintf(`
		SELECT
			c.id, c.document, c.name, c.trade_name, c.price_tier,
			c.credit_enabled,
			COALESCE(v.available_credit, 0) AS available_credit,
			COALESCE(c.document = '222222222222' OR c.name ILIKE '%%Consumidor Final%%' OR c.trade_name ILIKE '%%Mostrador%%', FALSE) AS is_default
		FROM customers c
		LEFT JOIN v_customer_credit_summary v ON v.customer_id = c.id
		%s
		ORDER BY is_default DESC, c.name ASC
		LIMIT 50
	`, whereClause)

	rows, err := q.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]dtos.CustomerSelectorResponse, 0)
	for rows.Next() {
		var it dtos.CustomerSelectorResponse
		if err := rows.Scan(
			&it.ID, &it.Document, &it.Name, &it.TradeName, &it.PriceTier,
			&it.CreditEnabled, &it.AvailableCredit, &it.IsDefault,
		); err != nil {
			return nil, err
		}
		list = append(list, it)
	}
	return list, rows.Err()
}

// GetCreditStatusSummary trae el resumen de crédito del cliente: cupo, saldo, pedidos reservados y disponible.
func (r *CustomerRepository) GetCreditStatusSummary(ctx context.Context, q db.DBExecutor, customerID int64) (*dtos.CustomerCreditStatusResponse, error) {
	const sql = `
		SELECT
			c.id, c.document, c.name, c.credit_enabled, c.credit_limit, c.credit_days,
			COALESCE(c.credit_warning_pct, 70.00) AS credit_warning_pct,
			COALESCE(v.credit_balance, 0) AS credit_balance,
			COALESCE(v.reserved_orders, 0) AS reserved_orders,
			COALESCE(v.available_credit, 0) AS available_credit,
			COALESCE((
				SELECT MAX(CURRENT_DATE - (s.sale_at::date + c.credit_days))
				FROM sales s
				WHERE s.customer_id = c.id
				  AND s.payment_status IN ('pending', 'partial')
				  AND (CURRENT_DATE - (s.sale_at::date + c.credit_days)) > 0
			), 0) AS overdue_days
		FROM customers c
		LEFT JOIN v_customer_credit_summary v ON v.customer_id = c.id
		WHERE c.id = $1 AND c.deleted_at IS NULL
	`
	var res dtos.CustomerCreditStatusResponse
	var overdueDays int
	err := q.QueryRow(ctx, sql, customerID).Scan(
		&res.CustomerID, &res.Document, &res.Name, &res.CreditEnabled, &res.CreditLimit, &res.PaymentTermsDays,
		&res.CreditWarningPct, &res.CreditBalance, &res.ReservedOrders, &res.AvailableCredit,
		&overdueDays,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	if overdueDays > 0 {
		res.HasOverdue = true
		res.OverdueDays = overdueDays
	}

	// credit_balance en v_customer_credit_summary es negativo cuando hay deuda
	if res.CreditBalance < 0 {
		res.CurrentDebt = -res.CreditBalance
	} else {
		res.CurrentDebt = 0
	}

	// Ocupación de crédito
	if res.CreditLimit > 0 {
		res.UsedCredit = res.CreditLimit - res.AvailableCredit
		if res.UsedCredit < 0 {
			res.UsedCredit = 0
		}
		res.UsedCreditPct = (res.UsedCredit / res.CreditLimit) * 100.0
		if res.UsedCreditPct >= res.CreditWarningPct {
			res.HasWarning = true
			res.WarningMessage = fmt.Sprintf(
				"ADVERTENCIA: El cliente ha utilizado el %.1f%% de su cupo disponible ($%.2f / $%.2f). Para aprobar este pedido debe realizar un abono a su saldo atrasado.",
				res.UsedCreditPct, res.UsedCredit, res.CreditLimit,
			)
		}
	}

	return &res, nil
}
