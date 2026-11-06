package repositories

// warehouse_facturation_repo · facturación de la bodega y sus series de documentos
// conecta con: WarehouseRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en warehouse_repo.go)

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"

	"github.com/jackc/pgx/v5"
)

type FacturationEntity struct {
	ID                   int64
	CompanyID            int64
	WarehouseID          int64
	TypeFacturation      types.TypeFacturation
	DocumentType         types.DocumentType
	NIT                  string
	LegalName            string
	TradeName            *string
	BillingEmail         *string
	BillingPhone         *string
	BillingAddress       *string
	BillingCity          *string
	LogoURL              *string
	VatWithholder        bool
	IncomeWithholder     bool
	SelfWithholder       bool
	InvoicePrefix        *string
	ResolutionNumber     *string
	ResolutionDate       *time.Time
	ResolutionValidUntil *time.Time
	RangeFrom            *int64
	RangeTo              *int64
	IsActive             bool
	CreatedAt            time.Time
	UpdatedAt            time.Time
}

type DocSeriesEntity struct {
	ID          int64
	CompanyID   int64
	WarehouseID *int64
	DocType     types.DocSeriesType
	Prefix      string
	NextNumber  int64
}

// FindFacturationByWarehouseID busca la configuración de facturación de una bodega.
func (r *WarehouseRepository) FindFacturationByWarehouseID(ctx context.Context, q db.DBExecutor, warehouseID int64) (*FacturationEntity, error) {
	const sql = `
		SELECT
			id, company_id, warehouse_id, type_facturation, document_type,
			nit, legal_name, trade_name, billing_email, billing_phone,
			billing_address, billing_city, logo_url,
			vat_withholder, income_withholder, self_withholder,
			invoice_prefix, resolution_number, resolution_date, resolution_valid_until,
			range_from, range_to, is_active, created_at, updated_at
		FROM warehouse_facturation
		WHERE warehouse_id = $1
	`
	var f FacturationEntity
	err := q.QueryRow(ctx, sql, warehouseID).Scan(
		&f.ID, &f.CompanyID, &f.WarehouseID, &f.TypeFacturation, &f.DocumentType,
		&f.NIT, &f.LegalName, &f.TradeName, &f.BillingEmail, &f.BillingPhone,
		&f.BillingAddress, &f.BillingCity, &f.LogoURL,
		&f.VatWithholder, &f.IncomeWithholder, &f.SelfWithholder,
		&f.InvoicePrefix, &f.ResolutionNumber, &f.ResolutionDate, &f.ResolutionValidUntil,
		&f.RangeFrom, &f.RangeTo, &f.IsActive, &f.CreatedAt, &f.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &f, nil
}

func (r *WarehouseRepository) HasNITInAnotherCompany(ctx context.Context, q db.DBExecutor, companyID, warehouseID int64, nit string) (bool, error) {
	const sql = `
		SELECT EXISTS (
			SELECT 1
			FROM warehouse_facturation
			WHERE company_id <> $1
			  AND warehouse_id <> $2
			  AND regexp_replace(nit, '[^0-9]', '', 'g') = regexp_replace($3, '[^0-9]', '', 'g')
		)
	`
	var exists bool
	err := q.QueryRow(ctx, sql, companyID, warehouseID, nit).Scan(&exists)
	return exists, err
}

// UpsertFacturation guarda la configuración de facturación de una bodega: la crea o la actualiza.
func (r *WarehouseRepository) UpsertFacturation(ctx context.Context, q db.DBExecutor, f *FacturationEntity) (*FacturationEntity, error) {
	const sql = `
		INSERT INTO warehouse_facturation (
			company_id, warehouse_id, type_facturation, document_type,
			nit, legal_name, trade_name, billing_email, billing_phone,
			billing_address, billing_city, logo_url,
			vat_withholder, income_withholder, self_withholder,
			invoice_prefix, resolution_number, resolution_date, resolution_valid_until,
			range_from, range_to, is_active
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
		)
		ON CONFLICT (warehouse_id) DO UPDATE SET
			type_facturation = EXCLUDED.type_facturation,
			document_type = EXCLUDED.document_type,
			nit = EXCLUDED.nit,
			legal_name = EXCLUDED.legal_name,
			trade_name = EXCLUDED.trade_name,
			billing_email = EXCLUDED.billing_email,
			billing_phone = EXCLUDED.billing_phone,
			billing_address = EXCLUDED.billing_address,
			billing_city = EXCLUDED.billing_city,
			logo_url = EXCLUDED.logo_url,
			vat_withholder = EXCLUDED.vat_withholder,
			income_withholder = EXCLUDED.income_withholder,
			self_withholder = EXCLUDED.self_withholder,
			invoice_prefix = EXCLUDED.invoice_prefix,
			resolution_number = EXCLUDED.resolution_number,
			resolution_date = EXCLUDED.resolution_date,
			resolution_valid_until = EXCLUDED.resolution_valid_until,
			range_from = EXCLUDED.range_from,
			range_to = EXCLUDED.range_to,
			is_active = EXCLUDED.is_active,
			updated_at = CURRENT_TIMESTAMP
		RETURNING id, created_at, updated_at
	`
	err := q.QueryRow(
		ctx, sql,
		f.CompanyID, f.WarehouseID, f.TypeFacturation, f.DocumentType,
		f.NIT, f.LegalName, f.TradeName, f.BillingEmail, f.BillingPhone,
		f.BillingAddress, f.BillingCity, f.LogoURL,
		f.VatWithholder, f.IncomeWithholder, f.SelfWithholder,
		f.InvoicePrefix, f.ResolutionNumber, f.ResolutionDate, f.ResolutionValidUntil,
		f.RangeFrom, f.RangeTo, f.IsActive,
	).Scan(&f.ID, &f.CreatedAt, &f.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return f, nil
}

// ListDocSeries lista las series de documentos de una bodega.
func (r *WarehouseRepository) ListDocSeries(ctx context.Context, q db.DBExecutor, companyID int64, warehouseID *int64, docType *types.DocSeriesType) ([]DocSeriesEntity, error) {
	where := "WHERE company_id = $1"
	args := []any{companyID}
	argIdx := 2

	if warehouseID != nil && *warehouseID > 0 {
		where += fmt.Sprintf(" AND warehouse_id = $%d", argIdx)
		args = append(args, *warehouseID)
		argIdx++
	}

	if docType != nil && *docType != "" {
		where += fmt.Sprintf(" AND doc_type = $%d", argIdx)
		args = append(args, *docType)
		argIdx++
	}

	sql := fmt.Sprintf(`
		SELECT id, company_id, warehouse_id, doc_type, prefix, next_number
		FROM doc_series
		%s
		ORDER BY doc_type ASC, id ASC
	`, where)

	rows, err := q.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]DocSeriesEntity, 0, 10)
	for rows.Next() {
		var s DocSeriesEntity
		if err := rows.Scan(&s.ID, &s.CompanyID, &s.WarehouseID, &s.DocType, &s.Prefix, &s.NextNumber); err != nil {
			return nil, err
		}
		items = append(items, s)
	}
	return items, nil
}

// FindDocSeriesByID busca una serie de documentos por su id.
func (r *WarehouseRepository) FindDocSeriesByID(ctx context.Context, q db.DBExecutor, id int64) (*DocSeriesEntity, error) {
	const sql = `
		SELECT id, company_id, warehouse_id, doc_type, prefix, next_number
		FROM doc_series
		WHERE id = $1
	`
	var s DocSeriesEntity
	err := q.QueryRow(ctx, sql, id).Scan(
		&s.ID, &s.CompanyID, &s.WarehouseID, &s.DocType, &s.Prefix, &s.NextNumber,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

// UpdateDocSeries actualiza los datos de una serie de documentos.
func (r *WarehouseRepository) UpdateDocSeries(ctx context.Context, q db.DBExecutor, id int64, prefix *string, nextNumber *int64) (*DocSeriesEntity, error) {
	current, err := r.FindDocSeriesByID(ctx, q, id)
	if err != nil {
		return nil, err
	}
	if current == nil {
		return nil, utils.NotFound("DOC_SERIES_NOT_FOUND", "La serie numérica no existe.")
	}

	if prefix != nil && strings.TrimSpace(*prefix) != "" {
		current.Prefix = strings.TrimSpace(*prefix)
	}
	if nextNumber != nil && *nextNumber >= 1 {
		current.NextNumber = *nextNumber
	}

	const sql = `
		UPDATE doc_series
		SET prefix = $1, next_number = $2
		WHERE id = $3
	`
	_, err = q.Exec(ctx, sql, current.Prefix, current.NextNumber, id)
	if err != nil {
		return nil, err
	}
	return current, nil
}

// InitDefaultWarehouseSeries crea las series de documentos por defecto de una bodega nueva.
func (r *WarehouseRepository) InitDefaultWarehouseSeries(ctx context.Context, q db.DBExecutor, companyID, warehouseID int64, warehouseCode string) error {
	defaultSeries := []struct {
		docType types.DocSeriesType
		prefix  string
	}{
		{types.SeriesSale, "PED-" + warehouseCode},
		{types.SeriesInvoice, "FAC-" + warehouseCode},
		{types.SeriesTransfer, "TRA-" + warehouseCode},
		{types.SeriesQuotation, "COT-" + warehouseCode},
		{types.SeriesPurchase, "COM-" + warehouseCode},
		{types.SeriesPayment, "RC-" + warehouseCode},
	}

	const sql = `
		INSERT INTO doc_series (company_id, warehouse_id, doc_type, prefix, next_number)
		VALUES ($1, $2, $3, $4, 1)
		ON CONFLICT (company_id, COALESCE(warehouse_id, 0), doc_type) DO NOTHING
	`
	for _, s := range defaultSeries {
		if _, err := q.Exec(ctx, sql, companyID, warehouseID, s.docType, s.prefix); err != nil {
			return err
		}
	}
	return nil
}
