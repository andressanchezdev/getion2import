package utils

import (
	"context"
	"errors"
	"fmt"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/types"

	"github.com/jackc/pgx/v5"
)

// NextSerialCode obtiene e incrementa atómicamente el consecutivo en doc_series dentro de una transacción.
func NextSerialCode(
	ctx context.Context,
	tx db.DBExecutor,
	companyID int64,
	warehouseID *int64,
	docType types.DocSeriesType,
	defaultPrefix string,
) (string, error) {
	var (
		seriesID   int64
		prefix     string
		nextNumber int64
	)

	const selectSQL = `
		SELECT id, prefix, next_number
		FROM doc_series
		WHERE company_id = $1
		  AND COALESCE(warehouse_id, 0) = COALESCE($2::bigint, 0)
		  AND doc_type = $3
		FOR UPDATE
	`
	err := tx.QueryRow(ctx, selectSQL, companyID, warehouseID, string(docType)).Scan(&seriesID, &prefix, &nextNumber)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			if defaultPrefix == "" {
				defaultPrefix = "DOC-"
			}
			const insertSQL = `
				INSERT INTO doc_series (company_id, warehouse_id, doc_type, prefix, next_number)
				VALUES ($1, $2, $3, $4, 2)
				RETURNING prefix
			`
			if err := tx.QueryRow(ctx, insertSQL, companyID, warehouseID, string(docType), defaultPrefix).Scan(&prefix); err != nil {
				return "", NormalizeDBError(err, "")
			}
			return fmt.Sprintf("%s%06d", prefix, 1), nil
		}
		return "", NormalizeDBError(err, "")
	}

	const updateSQL = `UPDATE doc_series SET next_number = next_number + 1 WHERE id = $1`
	if _, err := tx.Exec(ctx, updateSQL, seriesID); err != nil {
		return "", NormalizeDBError(err, "")
	}

	return fmt.Sprintf("%s%06d", prefix, nextNumber), nil
}
