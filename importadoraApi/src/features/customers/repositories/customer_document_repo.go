package repositories

// customer_document_repo · documentos del cliente
// conecta con: CustomerRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en customer_repo.go)

import (
	"context"
	"errors"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/types"

	"github.com/jackc/pgx/v5"
)

type CustomerDocumentEntity struct {
	ID         int64
	CustomerID int64
	DocType    types.CustomerDocType
	FileName   string
	FileURL    string
	MimeType   *string
	Notes      *string
	UploadedAt time.Time
}

// ListDocuments lista los documentos según los filtros, con su total para paginar.
func (r *CustomerRepository) ListDocuments(ctx context.Context, q db.DBExecutor, customerID int64) ([]CustomerDocumentEntity, error) {
	const sql = `
		SELECT id, customer_id, doc_type, file_name, file_url, mime_type, notes, uploaded_at
		FROM customer_documents
		WHERE customer_id = $1
		ORDER BY uploaded_at DESC
	`
	rows, err := q.Query(ctx, sql, customerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	docs := make([]CustomerDocumentEntity, 0)
	for rows.Next() {
		var d CustomerDocumentEntity
		if err := rows.Scan(
			&d.ID, &d.CustomerID, &d.DocType, &d.FileName, &d.FileURL, &d.MimeType, &d.Notes, &d.UploadedAt,
		); err != nil {
			return nil, err
		}
		docs = append(docs, d)
	}

	return docs, rows.Err()
}

// FindDocumentByID busca el documento por su id (nil si no existe).
func (r *CustomerRepository) FindDocumentByID(ctx context.Context, q db.DBExecutor, docID int64) (*CustomerDocumentEntity, error) {
	const sql = `
		SELECT id, customer_id, doc_type, file_name, file_url, mime_type, notes, uploaded_at
		FROM customer_documents
		WHERE id = $1
	`
	var d CustomerDocumentEntity
	err := q.QueryRow(ctx, sql, docID).Scan(
		&d.ID, &d.CustomerID, &d.DocType, &d.FileName, &d.FileURL, &d.MimeType, &d.Notes, &d.UploadedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &d, nil
}

// CreateDocument inserta el documento.
func (r *CustomerRepository) CreateDocument(ctx context.Context, q db.DBExecutor, d *CustomerDocumentEntity) (*CustomerDocumentEntity, error) {
	const sql = `
		INSERT INTO customer_documents (customer_id, doc_type, file_name, file_url, mime_type, notes)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, uploaded_at
	`
	err := q.QueryRow(ctx, sql,
		d.CustomerID, d.DocType, d.FileName, d.FileURL, d.MimeType, d.Notes,
	).Scan(&d.ID, &d.UploadedAt)
	if err != nil {
		return nil, err
	}
	return d, nil
}

// DeleteDocument elimina el documento.
func (r *CustomerRepository) DeleteDocument(ctx context.Context, q db.DBExecutor, docID int64) error {
	const sql = `DELETE FROM customer_documents WHERE id = $1`
	cmdTag, err := q.Exec(ctx, sql, docID)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("documento no encontrado")
	}
	return nil
}
