package repositories

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

type WarehouseEntity struct {
	ID          int64
	CompanyID   int64
	Code        string
	Name        string
	City        *string
	Address     *string
	Phone       *string
	Description *string
	IsActive    bool
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type FacturationEntity struct {
	ID                int64
	CompanyID         int64
	WarehouseID       int64
	TypeFacturation   types.TypeFacturation
	DocumentType      types.DocumentType
	NIT               string
	LegalName         string
	TradeName         *string
	BillingEmail      *string
	BillingPhone      *string
	BillingAddress    *string
	BillingCity       *string
	LogoURL           *string
	VatWithholder     bool
	IncomeWithholder  bool
	SelfWithholder    bool
	InvoicePrefix     *string
	ResolutionNumber  *string
	ResolutionDate    *time.Time
	RangeFrom         *int64
	RangeTo           *int64
	IsActive          bool
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type DocSeriesEntity struct {
	ID          int64
	CompanyID   int64
	WarehouseID *int64
	DocType     types.DocSeriesType
	Prefix      string
	NextNumber  int64
}

type WarehouseRepository struct{}

func NewWarehouseRepository() *WarehouseRepository {
	return &WarehouseRepository{}
}

func (r *WarehouseRepository) FindByID(ctx context.Context, q db.DBExecutor, id int64) (*WarehouseEntity, error) {
	const sql = `
		SELECT
			id, company_id, code, name,
			city, address, phone, description,
			is_active, created_at, updated_at
		FROM warehouses
		WHERE id = $1
	`
	var w WarehouseEntity
	err := q.QueryRow(ctx, sql, id).Scan(
		&w.ID, &w.CompanyID, &w.Code, &w.Name,
		&w.City, &w.Address, &w.Phone, &w.Description,
		&w.IsActive, &w.CreatedAt, &w.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &w, nil
}

func (r *WarehouseRepository) FindByCode(ctx context.Context, q db.DBExecutor, companyID int64, code string) (*WarehouseEntity, error) {
	const sql = `
		SELECT
			id, company_id, code, name,
			city, address, phone, description,
			is_active, created_at, updated_at
		FROM warehouses
		WHERE company_id = $1 AND UPPER(TRIM(code)) = UPPER(TRIM($2))
	`
	var w WarehouseEntity
	err := q.QueryRow(ctx, sql, companyID, code).Scan(
		&w.ID, &w.CompanyID, &w.Code, &w.Name,
		&w.City, &w.Address, &w.Phone, &w.Description,
		&w.IsActive, &w.CreatedAt, &w.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &w, nil
}

func (r *WarehouseRepository) List(ctx context.Context, q db.DBExecutor, companyID int64, params utils.PageParams) ([]WarehouseEntity, int, error) {
	const countSQL = `SELECT COUNT(*) FROM warehouses WHERE company_id = $1`
	var total int
	if err := q.QueryRow(ctx, countSQL, companyID).Scan(&total); err != nil {
		return nil, 0, err
	}

	const listSQL = `
		SELECT
			id, company_id, code, name,
			city, address, phone, description,
			is_active, created_at, updated_at
		FROM warehouses
		WHERE company_id = $1
		ORDER BY id ASC
		LIMIT $2 OFFSET $3
	`
	rows, err := q.Query(ctx, listSQL, companyID, params.PageSize, params.Offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]WarehouseEntity, 0, params.PageSize)
	for rows.Next() {
		var w WarehouseEntity
		if err := rows.Scan(
			&w.ID, &w.CompanyID, &w.Code, &w.Name,
			&w.City, &w.Address, &w.Phone, &w.Description,
			&w.IsActive, &w.CreatedAt, &w.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		items = append(items, w)
	}

	return items, total, nil
}

func (r *WarehouseRepository) Search(ctx context.Context, q db.DBExecutor, companyID int64, query string, params utils.PageParams) ([]WarehouseEntity, int, error) {
	cleanQuery := "%" + strings.ToLower(strings.TrimSpace(query)) + "%"

	const countSQL = `
		SELECT COUNT(*) FROM warehouses
		WHERE company_id = $1 AND (
			LOWER(code) LIKE $2 OR LOWER(name) LIKE $2 OR
			LOWER(COALESCE(city, '')) LIKE $2 OR LOWER(COALESCE(phone, '')) LIKE $2
		)
	`
	var total int
	if err := q.QueryRow(ctx, countSQL, companyID, cleanQuery).Scan(&total); err != nil {
		return nil, 0, err
	}

	const searchSQL = `
		SELECT
			id, company_id, code, name,
			city, address, phone, description,
			is_active, created_at, updated_at
		FROM warehouses
		WHERE company_id = $1 AND (
			LOWER(code) LIKE $2 OR LOWER(name) LIKE $2 OR
			LOWER(COALESCE(city, '')) LIKE $2 OR LOWER(COALESCE(phone, '')) LIKE $2
		)
		ORDER BY code ASC
		LIMIT $3 OFFSET $4
	`
	rows, err := q.Query(ctx, searchSQL, companyID, cleanQuery, params.PageSize, params.Offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]WarehouseEntity, 0, params.PageSize)
	for rows.Next() {
		var w WarehouseEntity
		if err := rows.Scan(
			&w.ID, &w.CompanyID, &w.Code, &w.Name,
			&w.City, &w.Address, &w.Phone, &w.Description,
			&w.IsActive, &w.CreatedAt, &w.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		items = append(items, w)
	}

	return items, total, nil
}

func (r *WarehouseRepository) Create(ctx context.Context, q db.DBExecutor, w *WarehouseEntity) (*WarehouseEntity, error) {
	const sql = `
		INSERT INTO warehouses (
			company_id, code, name, city, address, phone, description, is_active
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at
	`
	err := q.QueryRow(
		ctx, sql,
		w.CompanyID, w.Code, w.Name, w.City, w.Address, w.Phone, w.Description, w.IsActive,
	).Scan(&w.ID, &w.CreatedAt, &w.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return w, nil
}

func (r *WarehouseRepository) Update(ctx context.Context, q db.DBExecutor, w *WarehouseEntity) (*WarehouseEntity, error) {
	const sql = `
		UPDATE warehouses
		SET
			code = $1,
			name = $2,
			city = $3,
			address = $4,
			phone = $5,
			description = $6,
			is_active = $7,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $8
		RETURNING updated_at
	`
	err := q.QueryRow(
		ctx, sql,
		w.Code, w.Name, w.City, w.Address, w.Phone, w.Description, w.IsActive, w.ID,
	).Scan(&w.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return w, nil
}

func (r *WarehouseRepository) Deactivate(ctx context.Context, q db.DBExecutor, id int64) error {
	const sql = `
		UPDATE warehouses
		SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`
	cmd, err := q.Exec(ctx, sql, id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return utils.NotFound("WAREHOUSE_NOT_FOUND", "La bodega no existe.")
	}
	return nil
}

// Facturation Repository Methods

func (r *WarehouseRepository) FindFacturationByWarehouseID(ctx context.Context, q db.DBExecutor, warehouseID int64) (*FacturationEntity, error) {
	const sql = `
		SELECT
			id, company_id, warehouse_id, type_facturation, document_type,
			nit, legal_name, trade_name, billing_email, billing_phone,
			billing_address, billing_city, logo_url,
			vat_withholder, income_withholder, self_withholder,
			invoice_prefix, resolution_number, resolution_date,
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
		&f.InvoicePrefix, &f.ResolutionNumber, &f.ResolutionDate,
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

func (r *WarehouseRepository) UpsertFacturation(ctx context.Context, q db.DBExecutor, f *FacturationEntity) (*FacturationEntity, error) {
	const sql = `
		INSERT INTO warehouse_facturation (
			company_id, warehouse_id, type_facturation, document_type,
			nit, legal_name, trade_name, billing_email, billing_phone,
			billing_address, billing_city, logo_url,
			vat_withholder, income_withholder, self_withholder,
			invoice_prefix, resolution_number, resolution_date,
			range_from, range_to, is_active
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
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
		f.InvoicePrefix, f.ResolutionNumber, f.ResolutionDate,
		f.RangeFrom, f.RangeTo, f.IsActive,
	).Scan(&f.ID, &f.CreatedAt, &f.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return f, nil
}

// DocSeries Repository Methods

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
