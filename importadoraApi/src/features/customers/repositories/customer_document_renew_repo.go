package repositories

// customer_document_renew_repo · renovación de documentos del cliente y consulta de los vencidos o por vencer
// conecta con: CustomerRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en customer_repo.go)

import (
	"context"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/types"
)

// DocumentAlertEntity es un documento por vencer junto con los datos del cliente y su vigencia.
type DocumentAlertEntity struct {
	DocumentID       int64
	CustomerID       int64
	CustomerName     string
	CustomerDocument string
	DocType          types.CustomerDocType
	FileName         string
	UploadedAt       time.Time
	ValidityMonths   int
}

// RenewDocument guarda el archivo y las notas del documento y reinicia su vigencia (la fecha de subida pasa a ser ahora).
func (r *CustomerRepository) RenewDocument(ctx context.Context, q db.DBExecutor, d *CustomerDocumentEntity) (*CustomerDocumentEntity, error) {
	const sql = `
		UPDATE customer_documents SET
			file_name = $2, file_url = $3, mime_type = $4, notes = $5,
			uploaded_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING uploaded_at
	`
	if err := q.QueryRow(ctx, sql, d.ID, d.FileName, d.FileURL, d.MimeType, d.Notes).Scan(&d.UploadedAt); err != nil {
		return nil, err
	}
	return d, nil
}

// ListDocumentAlerts trae los documentos de clientes activos cuya vigencia ya terminó o termina dentro de los días indicados, el que vence primero arriba.
func (r *CustomerRepository) ListDocumentAlerts(ctx context.Context, q db.DBExecutor, companyID int64, withinDays int) ([]DocumentAlertEntity, error) {
	const sql = `
		SELECT d.id, d.customer_id, c.name, c.document, d.doc_type, d.file_name, d.uploaded_at, c.docs_validity_months
		FROM customer_documents d
		JOIN customers c ON c.id = d.customer_id
		WHERE c.company_id = $1
		  AND c.deleted_at IS NULL
		  AND c.status = 'active'
		  AND d.uploaded_at + make_interval(months => c.docs_validity_months) <= CURRENT_TIMESTAMP + make_interval(days => $2::int)
		ORDER BY d.uploaded_at + make_interval(months => c.docs_validity_months) ASC
	`
	rows, err := q.Query(ctx, sql, companyID, withinDays)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	alerts := make([]DocumentAlertEntity, 0)
	for rows.Next() {
		var a DocumentAlertEntity
		if err := rows.Scan(&a.DocumentID, &a.CustomerID, &a.CustomerName, &a.CustomerDocument, &a.DocType, &a.FileName, &a.UploadedAt, &a.ValidityMonths); err != nil {
			return nil, err
		}
		alerts = append(alerts, a)
	}
	return alerts, rows.Err()
}
