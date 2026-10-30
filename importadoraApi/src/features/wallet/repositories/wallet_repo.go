package repositories

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/types"
	"importadoraApi/src/features/wallet/dtos"

	"github.com/jackc/pgx/v5"
)

type CreditEntryEntity struct {
	ID            int64
	CompanyID     int64
	CustomerID    int64
	CustomerName  string
	EmployeeID    *int64
	EmployeeName  *string
	EntryType     types.CreditEntryType
	Amount        float64
	SaleID        *int64
	SaleSerial    *string
	PaymentID     *int64
	PaymentSerial *string
	ReturnID      *int64
	Reason        *string
	CreatedAt     time.Time
}

type CustomerCreditSummaryEntity struct {
	CustomerID      int64
	CompanyID       int64
	Document        string
	CustomerName    string
	CreditEnabled   bool
	CreditLimit     float64
	CreditDays      int16
	CreditBalance   float64
	ReservedOrders  float64
	AvailableCredit float64
}

type WalletRepository struct{}

func NewWalletRepository() *WalletRepository {
	return &WalletRepository{}
}

func (r *WalletRepository) GetCustomerCreditSummary(ctx context.Context, q db.DBExecutor, customerID int64) (*CustomerCreditSummaryEntity, error) {
	const sql = `
		SELECT
			customer_id, company_id, document, name,
			credit_enabled, credit_limit, credit_days,
			credit_balance, reserved_orders, available_credit
		FROM v_customer_credit_summary
		WHERE customer_id = $1
	`
	var e CustomerCreditSummaryEntity
	err := q.QueryRow(ctx, sql, customerID).Scan(
		&e.CustomerID, &e.CompanyID, &e.Document, &e.CustomerName,
		&e.CreditEnabled, &e.CreditLimit, &e.CreditDays,
		&e.CreditBalance, &e.ReservedOrders, &e.AvailableCredit,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &e, nil
}

func (r *WalletRepository) ListEntries(ctx context.Context, q db.DBExecutor, f dtos.CreditEntryFilterQuery) ([]CreditEntryEntity, int, error) {
	where := make([]string, 0)
	args := make([]interface{}, 0)
	argIdx := 1

	if f.CompanyID != nil {
		where = append(where, fmt.Sprintf("ce.company_id = $%d", argIdx))
		args = append(args, *f.CompanyID)
		argIdx++
	}

	if f.CustomerID != nil {
		where = append(where, fmt.Sprintf("ce.customer_id = $%d", argIdx))
		args = append(args, *f.CustomerID)
		argIdx++
	}

	if f.EntryType != nil && *f.EntryType != "" {
		where = append(where, fmt.Sprintf("ce.entry_type = $%d", argIdx))
		args = append(args, *f.EntryType)
		argIdx++
	}

	whereClause := ""
	if len(where) > 0 {
		whereClause = "WHERE " + strings.Join(where, " AND ")
	}

	countSQL := fmt.Sprintf(`SELECT COUNT(*) FROM credit_entries ce %s`, whereClause)
	var total int
	if err := q.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	pageSize := f.PageSize
	if pageSize <= 0 {
		pageSize = 30
	}
	page := f.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * pageSize

	selectSQL := fmt.Sprintf(`
		SELECT
			ce.id, ce.company_id, ce.customer_id, c.name,
			ce.employee_id, e.full_name,
			ce.entry_type, ce.amount,
			ce.sale_id, s.serial_code,
			ce.payment_id, p.serial_code,
			ce.return_id, ce.reason, ce.created_at
		FROM credit_entries ce
		JOIN customers c ON c.id = ce.customer_id
		LEFT JOIN employees e ON e.id = ce.employee_id
		LEFT JOIN sales s ON s.id = ce.sale_id
		LEFT JOIN payments p ON p.id = ce.payment_id
		%s
		ORDER BY ce.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, pageSize, offset)

	rows, err := q.Query(ctx, selectSQL, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list := make([]CreditEntryEntity, 0)
	for rows.Next() {
		var it CreditEntryEntity
		if err := rows.Scan(
			&it.ID, &it.CompanyID, &it.CustomerID, &it.CustomerName,
			&it.EmployeeID, &it.EmployeeName,
			&it.EntryType, &it.Amount,
			&it.SaleID, &it.SaleSerial,
			&it.PaymentID, &it.PaymentSerial,
			&it.ReturnID, &it.Reason, &it.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, it)
	}

	return list, total, rows.Err()
}

func (r *WalletRepository) CreateAdjustment(ctx context.Context, q db.DBExecutor, companyID, customerID int64, employeeID *int64, amount float64, reason string) (int64, error) {
	const sql = `
		INSERT INTO credit_entries (
			company_id, customer_id, employee_id, entry_type, amount, reason
		) VALUES (
			$1, $2, $3, 'adjust', $4, $5
		)
		RETURNING id
	`
	var id int64
	err := q.QueryRow(ctx, sql, companyID, customerID, employeeID, amount, reason).Scan(&id)
	return id, err
}

