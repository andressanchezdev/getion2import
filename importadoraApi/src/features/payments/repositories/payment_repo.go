package repositories

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/types"
	"importadoraApi/src/features/payments/dtos"

	"github.com/jackc/pgx/v5"
)

type PaymentEntity struct {
	ID                   int64
	CompanyID            int64
	SerialCode           string
	SaleID               int64
	SaleSerial           string
	CustomerID           int64
	CustomerName         string
	EmployeeID           int64
	EmployeeName         string
	VerifiedByEmployeeID *int64
	VerifiedByName       *string
	Method               types.PaymentMethod
	Amount               float64
	Status               types.PaymentStatus
	ProofURL             *string
	Reference            *string
	IssueNote            *string
	VoidReason           *string
	VerifiedAt           *time.Time
	CreatedAt            time.Time
}

type PaymentRepository struct{}

func NewPaymentRepository() *PaymentRepository {
	return &PaymentRepository{}
}

func (r *PaymentRepository) Create(ctx context.Context, q db.DBExecutor, p *PaymentEntity) (*PaymentEntity, error) {
	const sql = `
		INSERT INTO payments (
			company_id, serial_code, sale_id, customer_id, employee_id,
			method, amount, status, proof_url, reference, issue_note
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
		)
		RETURNING id, created_at
	`
	err := q.QueryRow(ctx, sql,
		p.CompanyID, p.SerialCode, p.SaleID, p.CustomerID, p.EmployeeID,
		p.Method, p.Amount, p.Status, p.ProofURL, p.Reference, p.IssueNote,
	).Scan(&p.ID, &p.CreatedAt)
	if err != nil {
		return nil, err
	}
	return p, nil
}

func (r *PaymentRepository) FindByID(ctx context.Context, q db.DBExecutor, id int64) (*PaymentEntity, error) {
	const sql = `
		SELECT
			p.id, p.company_id, p.serial_code, p.sale_id, s.serial_code,
			p.customer_id, c.name,
			p.employee_id, e.full_name,
			p.verified_by_employee_id, ve.full_name,
			p.method, p.amount, p.status, p.proof_url, p.reference,
			p.issue_note, p.void_reason, p.verified_at, p.created_at
		FROM payments p
		JOIN sales s ON s.id = p.sale_id
		JOIN customers c ON c.id = p.customer_id
		JOIN employees e ON e.id = p.employee_id
		LEFT JOIN employees ve ON ve.id = p.verified_by_employee_id
		WHERE p.id = $1
	`
	var entity PaymentEntity
	err := q.QueryRow(ctx, sql, id).Scan(
		&entity.ID, &entity.CompanyID, &entity.SerialCode, &entity.SaleID, &entity.SaleSerial,
		&entity.CustomerID, &entity.CustomerName,
		&entity.EmployeeID, &entity.EmployeeName,
		&entity.VerifiedByEmployeeID, &entity.VerifiedByName,
		&entity.Method, &entity.Amount, &entity.Status, &entity.ProofURL, &entity.Reference,
		&entity.IssueNote, &entity.VoidReason, &entity.VerifiedAt, &entity.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &entity, nil
}

func (r *PaymentRepository) List(ctx context.Context, q db.DBExecutor, f dtos.PaymentFilterQuery) ([]PaymentEntity, int, error) {
	where := make([]string, 0)
	args := make([]interface{}, 0)
	argIdx := 1

	if f.CompanyID != nil {
		where = append(where, fmt.Sprintf("p.company_id = $%d", argIdx))
		args = append(args, *f.CompanyID)
		argIdx++
	}

	if f.SaleID != nil {
		where = append(where, fmt.Sprintf("p.sale_id = $%d", argIdx))
		args = append(args, *f.SaleID)
		argIdx++
	}

	if f.CustomerID != nil {
		where = append(where, fmt.Sprintf("p.customer_id = $%d", argIdx))
		args = append(args, *f.CustomerID)
		argIdx++
	}

	if f.Status != nil && *f.Status != "" {
		where = append(where, fmt.Sprintf("p.status = $%d", argIdx))
		args = append(args, *f.Status)
		argIdx++
	}

	if f.Method != nil && *f.Method != "" {
		where = append(where, fmt.Sprintf("p.method = $%d", argIdx))
		args = append(args, *f.Method)
		argIdx++
	}

	if strings.TrimSpace(f.Search) != "" {
		where = append(where, fmt.Sprintf("(p.serial_code ILIKE $%d OR p.reference ILIKE $%d OR c.name ILIKE $%d)", argIdx, argIdx, argIdx))
		pattern := "%" + strings.TrimSpace(f.Search) + "%"
		args = append(args, pattern)
		argIdx++
	}

	whereClause := ""
	if len(where) > 0 {
		whereClause = "WHERE " + strings.Join(where, " AND ")
	}

	countSQL := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM payments p
		JOIN customers c ON c.id = p.customer_id
		%s
	`, whereClause)

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
			p.id, p.company_id, p.serial_code, p.sale_id, s.serial_code,
			p.customer_id, c.name,
			p.employee_id, e.full_name,
			p.verified_by_employee_id, ve.full_name,
			p.method, p.amount, p.status, p.proof_url, p.reference,
			p.issue_note, p.void_reason, p.verified_at, p.created_at
		FROM payments p
		JOIN sales s ON s.id = p.sale_id
		JOIN customers c ON c.id = p.customer_id
		JOIN employees e ON e.id = p.employee_id
		LEFT JOIN employees ve ON ve.id = p.verified_by_employee_id
		%s
		ORDER BY p.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, pageSize, offset)

	rows, err := q.Query(ctx, selectSQL, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list := make([]PaymentEntity, 0)
	for rows.Next() {
		var entity PaymentEntity
		if err := rows.Scan(
			&entity.ID, &entity.CompanyID, &entity.SerialCode, &entity.SaleID, &entity.SaleSerial,
			&entity.CustomerID, &entity.CustomerName,
			&entity.EmployeeID, &entity.EmployeeName,
			&entity.VerifiedByEmployeeID, &entity.VerifiedByName,
			&entity.Method, &entity.Amount, &entity.Status, &entity.ProofURL, &entity.Reference,
			&entity.IssueNote, &entity.VoidReason, &entity.VerifiedAt, &entity.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, entity)
	}

	return list, total, rows.Err()
}

func (r *PaymentRepository) Verify(ctx context.Context, q db.DBExecutor, paymentID, verifierEmployeeID int64, issueNote *string) error {
	const sql = `
		UPDATE payments SET
			status = 'verified',
			verified_by_employee_id = $1,
			verified_at = CURRENT_TIMESTAMP,
			issue_note = COALESCE($2, issue_note)
		WHERE id = $3 AND status = 'review'
	`
	cmdTag, err := q.Exec(ctx, sql, verifierEmployeeID, issueNote, paymentID)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("el pago no existe o ya no se encuentra en estado de revisión")
	}
	return nil
}

func (r *PaymentRepository) Void(ctx context.Context, q db.DBExecutor, paymentID, employeeID int64, voidReason string) error {
	const sql = `
		UPDATE payments SET
			status = 'voided',
			verified_by_employee_id = $1,
			verified_at = CURRENT_TIMESTAMP,
			void_reason = $2
		WHERE id = $3 AND status = 'review'
	`
	cmdTag, err := q.Exec(ctx, sql, employeeID, voidReason, paymentID)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("el pago no existe o ya no se encuentra en estado de revisión")
	}
	return nil
}

