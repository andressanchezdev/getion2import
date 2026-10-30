package repositories

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/features/bank_statements/dtos"
	"importadoraApi/src/features/bank_statements/entities"

	"github.com/jackc/pgx/v5"
)

type BankStatementRepository struct{}

func NewBankStatementRepository() *BankStatementRepository {
	return &BankStatementRepository{}
}

func (r *BankStatementRepository) InsertBatch(ctx context.Context, q db.DBExecutor, records []entities.BankStatementRecordEntity) (int, error) {
	if len(records) == 0 {
		return 0, nil
	}

	inserted := 0
	const sql = `
		INSERT INTO bank_statement_records (
			company_id, bank_name, account_number, movement_date, description,
			branch_channel, reference1, reference2, document_number, amount,
			is_income, status, notes
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`
	for _, rec := range records {
		_, err := q.Exec(ctx, sql,
			rec.CompanyID, rec.BankName, rec.AccountNumber, rec.MovementDate, rec.Description,
			rec.BranchChannel, rec.Reference1, rec.Reference2, rec.DocumentNumber, rec.Amount,
			rec.IsIncome, rec.Status, rec.Notes,
		)
		if err == nil {
			inserted++
		}
	}
	return inserted, nil
}

func (r *BankStatementRepository) FindFiltered(ctx context.Context, q db.DBExecutor, filter dtos.BankStatementFilterQuery) ([]entities.BankStatementRecordEntity, int, error) {
	var conditions []string
	var args []any
	argIdx := 1

	conditions = append(conditions, fmt.Sprintf("r.company_id = $%d", argIdx))
	args = append(args, filter.CompanyID)
	argIdx++

	if filter.Status != "" {
		conditions = append(conditions, fmt.Sprintf("r.status = $%d", argIdx))
		args = append(args, filter.Status)
		argIdx++
	}

	if filter.Description != "" {
		conditions = append(conditions, fmt.Sprintf("(r.description ILIKE $%d OR r.branch_channel ILIKE $%d OR COALESCE(r.reference1, '') ILIKE $%d)", argIdx, argIdx, argIdx))
		args = append(args, "%"+filter.Description+"%")
		argIdx++
	}

	if filter.BranchChannel != "" {
		conditions = append(conditions, fmt.Sprintf("r.branch_channel ILIKE $%d", argIdx))
		args = append(args, "%"+filter.BranchChannel+"%")
		argIdx++
	}

	if filter.DateFrom != "" {
		conditions = append(conditions, fmt.Sprintf("r.movement_date >= $%d::date", argIdx))
		args = append(args, filter.DateFrom)
		argIdx++
	}

	if filter.DateTo != "" {
		conditions = append(conditions, fmt.Sprintf("r.movement_date <= $%d::date", argIdx))
		args = append(args, filter.DateTo)
		argIdx++
	}

	whereClause := strings.Join(conditions, " AND ")

	countSQL := fmt.Sprintf(`SELECT COUNT(*) FROM bank_statement_records r WHERE %s`, whereClause)
	var total int
	if err := q.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	pageSize := filter.PageSize
	if pageSize <= 0 {
		pageSize = 50
	}
	offset := (filter.Page - 1) * pageSize
	if offset < 0 {
		offset = 0
	}

	selectSQL := fmt.Sprintf(`
		SELECT
			r.id, r.company_id, r.bank_name, r.account_number, r.movement_date,
			r.description, r.branch_channel, r.reference1, r.reference2, r.document_number,
			r.amount, r.is_income, r.status, r.confirmed_by_id, e.full_name AS confirmed_by_name,
			r.confirmed_at, r.notes, r.created_at
		FROM bank_statement_records r
		LEFT JOIN employees e ON e.id = r.confirmed_by_id
		WHERE %s
		ORDER BY r.movement_date DESC, r.id DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, pageSize, offset)

	rows, err := q.Query(ctx, selectSQL, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var list []entities.BankStatementRecordEntity
	for rows.Next() {
		var it entities.BankStatementRecordEntity
		var uName *string
		if err := rows.Scan(
			&it.ID, &it.CompanyID, &it.BankName, &it.AccountNumber, &it.MovementDate,
			&it.Description, &it.BranchChannel, &it.Reference1, &it.Reference2, &it.DocumentNumber,
			&it.Amount, &it.IsIncome, &it.Status, &it.ConfirmedByID, &uName,
			&it.ConfirmedAt, &it.Notes, &it.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		it.ConfirmedByName = uName
		list = append(list, it)
	}

	return list, total, rows.Err()
}

func (r *BankStatementRepository) FindByID(ctx context.Context, q db.DBExecutor, companyID int64, id int64) (*entities.BankStatementRecordEntity, error) {
	const sql = `
		SELECT
			r.id, r.company_id, r.bank_name, r.account_number, r.movement_date,
			r.description, r.branch_channel, r.reference1, r.reference2, r.document_number,
			r.amount, r.is_income, r.status, r.confirmed_by_id, e.full_name AS confirmed_by_name,
			r.confirmed_at, r.notes, r.created_at
		FROM bank_statement_records r
		LEFT JOIN employees e ON e.id = r.confirmed_by_id
		WHERE r.company_id = $1 AND r.id = $2
	`
	var it entities.BankStatementRecordEntity
	var uName *string
	err := q.QueryRow(ctx, sql, companyID, id).Scan(
		&it.ID, &it.CompanyID, &it.BankName, &it.AccountNumber, &it.MovementDate,
		&it.Description, &it.BranchChannel, &it.Reference1, &it.Reference2, &it.DocumentNumber,
		&it.Amount, &it.IsIncome, &it.Status, &it.ConfirmedByID, &uName,
		&it.ConfirmedAt, &it.Notes, &it.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	it.ConfirmedByName = uName
	return &it, nil
}

func (r *BankStatementRepository) UpdateStatus(ctx context.Context, q db.DBExecutor, companyID int64, id int64, status string, confirmedByID *int64, notes *string) error {
	now := time.Now()
	var confirmedAt *time.Time
	if status == "confirmed" {
		confirmedAt = &now
	}

	const sql = `
		UPDATE bank_statement_records SET
			status = $1,
			confirmed_by_id = $2,
			confirmed_at = $3,
			notes = COALESCE($4, notes)
		WHERE company_id = $5 AND id = $6
	`
	_, err := q.Exec(ctx, sql, status, confirmedByID, confirmedAt, notes, companyID, id)
	return err
}

