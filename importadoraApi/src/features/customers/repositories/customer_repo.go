package repositories

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/types"
	"importadoraApi/src/features/customers/dtos"

	"github.com/jackc/pgx/v5"
)

type CustomerEntity struct {
	ID                  int64
	CompanyID           int64
	DocumentType        types.DocumentType
	Document            string
	PersonType          types.PersonType
	Name                string
	LastName            *string
	TradeName           *string
	LegalRepresentative *string
	Email               *string
	Phone               *string
	Mobile              *string
	Address             *string
	City                *string
	VATResponsible      bool
	FiscalRespCodes     []string
	Addresses           []byte
	Contacts            []byte
	PriceTier           types.PriceTier
	DiscountPercent     float64
	CreditEnabled       bool
	CreditLimit         float64
	CreditDays          int16
	CreditWarningPct    float64
	DocsValidityMonths  int
	Status              types.CustomerStatus
	CreatedAt           time.Time
	UpdatedAt           time.Time
	DeletedAt           *time.Time
}

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

type CustomerRepository struct{}

func NewCustomerRepository() *CustomerRepository {
	return &CustomerRepository{}
}

func (r *CustomerRepository) FindByID(ctx context.Context, q db.DBExecutor, id int64) (*CustomerEntity, error) {
	const sql = `
		SELECT
			id, company_id, document_type, document, person_type,
			name, last_name, trade_name, legal_representative,
			email, phone, mobile, address, city,
			vat_responsible, fiscal_resp_codes, addresses, contacts,
			price_tier, discount_percent, credit_enabled, credit_limit, credit_days, credit_warning_pct, docs_validity_months,
			status, created_at, updated_at, deleted_at
		FROM customers
		WHERE id = $1 AND deleted_at IS NULL
	`
	var c CustomerEntity
	err := q.QueryRow(ctx, sql, id).Scan(
		&c.ID, &c.CompanyID, &c.DocumentType, &c.Document, &c.PersonType,
		&c.Name, &c.LastName, &c.TradeName, &c.LegalRepresentative,
		&c.Email, &c.Phone, &c.Mobile, &c.Address, &c.City,
		&c.VATResponsible, &c.FiscalRespCodes, &c.Addresses, &c.Contacts,
		&c.PriceTier, &c.DiscountPercent, &c.CreditEnabled, &c.CreditLimit, &c.CreditDays, &c.CreditWarningPct, &c.DocsValidityMonths,
		&c.Status, &c.CreatedAt, &c.UpdatedAt, &c.DeletedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

func (r *CustomerRepository) FindByCompanyAndDocument(ctx context.Context, q db.DBExecutor, companyID int64, document string) (*CustomerEntity, error) {
	const sql = `
		SELECT
			id, company_id, document_type, document, person_type,
			name, last_name, trade_name, legal_representative,
			email, phone, mobile, address, city,
			vat_responsible, fiscal_resp_codes, addresses, contacts,
			price_tier, discount_percent, credit_enabled, credit_limit, credit_days, credit_warning_pct, docs_validity_months,
			status, created_at, updated_at, deleted_at
		FROM customers
		WHERE company_id = $1 AND document = $2 AND deleted_at IS NULL
	`
	var c CustomerEntity
	err := q.QueryRow(ctx, sql, companyID, document).Scan(
		&c.ID, &c.CompanyID, &c.DocumentType, &c.Document, &c.PersonType,
		&c.Name, &c.LastName, &c.TradeName, &c.LegalRepresentative,
		&c.Email, &c.Phone, &c.Mobile, &c.Address, &c.City,
		&c.VATResponsible, &c.FiscalRespCodes, &c.Addresses, &c.Contacts,
		&c.PriceTier, &c.DiscountPercent, &c.CreditEnabled, &c.CreditLimit, &c.CreditDays, &c.CreditWarningPct, &c.DocsValidityMonths,
		&c.Status, &c.CreatedAt, &c.UpdatedAt, &c.DeletedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

func (r *CustomerRepository) List(ctx context.Context, q db.DBExecutor, f dtos.CustomerFilterQuery) ([]CustomerEntity, int, error) {
	where := []string{"deleted_at IS NULL"}
	args := make([]interface{}, 0)
	argIdx := 1

	if f.CompanyID != nil {
		where = append(where, fmt.Sprintf("company_id = $%d", argIdx))
		args = append(args, *f.CompanyID)
		argIdx++
	}

	if f.Status != nil && *f.Status != "" {
		where = append(where, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, *f.Status)
		argIdx++
	}

	if f.CreditEnabled != nil {
		where = append(where, fmt.Sprintf("credit_enabled = $%d", argIdx))
		args = append(args, *f.CreditEnabled)
		argIdx++
	}

	if f.PriceTier != nil && *f.PriceTier != "" {
		where = append(where, fmt.Sprintf("price_tier = $%d", argIdx))
		args = append(args, *f.PriceTier)
		argIdx++
	}

	if f.Search != "" {
		where = append(where, fmt.Sprintf("(name ILIKE $%d OR COALESCE(last_name, '') ILIKE $%d OR COALESCE(trade_name, '') ILIKE $%d OR document ILIKE $%d OR COALESCE(email::text, '') ILIKE $%d OR COALESCE(phone, '') ILIKE $%d OR COALESCE(mobile, '') ILIKE $%d)", argIdx, argIdx, argIdx, argIdx, argIdx, argIdx, argIdx))
		args = append(args, "%"+f.Search+"%")
		argIdx++
	}

	whereClause := "WHERE " + strings.Join(where, " AND ")

	countSQL := fmt.Sprintf("SELECT COUNT(*) FROM customers %s", whereClause)
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
			id, company_id, document_type, document, person_type,
			name, last_name, trade_name, legal_representative,
			email, phone, mobile, address, city,
			vat_responsible, fiscal_resp_codes, addresses, contacts,
			price_tier, discount_percent, credit_enabled, credit_limit, credit_days, credit_warning_pct, docs_validity_months,
			status, created_at, updated_at, deleted_at
		FROM customers
		%s
		ORDER BY id ASC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, pageSize, offset)

	rows, err := q.Query(ctx, selectSQL, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list := make([]CustomerEntity, 0)
	for rows.Next() {
		var c CustomerEntity
		if err := rows.Scan(
			&c.ID, &c.CompanyID, &c.DocumentType, &c.Document, &c.PersonType,
			&c.Name, &c.LastName, &c.TradeName, &c.LegalRepresentative,
			&c.Email, &c.Phone, &c.Mobile, &c.Address, &c.City,
			&c.VATResponsible, &c.FiscalRespCodes, &c.Addresses, &c.Contacts,
			&c.PriceTier, &c.DiscountPercent, &c.CreditEnabled, &c.CreditLimit, &c.CreditDays, &c.CreditWarningPct, &c.DocsValidityMonths,
			&c.Status, &c.CreatedAt, &c.UpdatedAt, &c.DeletedAt,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, c)
	}

	return list, total, rows.Err()
}

func (r *CustomerRepository) Create(ctx context.Context, q db.DBExecutor, c *CustomerEntity) (*CustomerEntity, error) {
	if len(c.FiscalRespCodes) == 0 {
		c.FiscalRespCodes = []string{"R-99-PN"}
	}
	if len(c.Addresses) == 0 {
		c.Addresses = []byte("[]")
	}
	if len(c.Contacts) == 0 {
		c.Contacts = []byte("[]")
	}

	if c.DocsValidityMonths <= 0 {
		c.DocsValidityMonths = 12
	}

	if c.CreditWarningPct <= 0 {
		c.CreditWarningPct = 70.00
	}

	const sql = `
		INSERT INTO customers (
			company_id, document_type, document, person_type,
			name, last_name, trade_name, legal_representative,
			email, phone, mobile, address, city,
			vat_responsible, fiscal_resp_codes, addresses, contacts,
			price_tier, discount_percent, credit_enabled, credit_limit, credit_days, credit_warning_pct,
			docs_validity_months, status
		) VALUES (
			$1, $2, $3, $4,
			$5, $6, $7, $8,
			$9, $10, $11, $12, $13,
			$14, $15, $16, $17,
			$18, $19, $20, $21, $22, $23,
			$24, $25
		)
		RETURNING id, created_at, updated_at
	`
	err := q.QueryRow(ctx, sql,
		c.CompanyID, c.DocumentType, c.Document, c.PersonType,
		c.Name, c.LastName, c.TradeName, c.LegalRepresentative,
		c.Email, c.Phone, c.Mobile, c.Address, c.City,
		c.VATResponsible, c.FiscalRespCodes, c.Addresses, c.Contacts,
		c.PriceTier, c.DiscountPercent, c.CreditEnabled, c.CreditLimit, c.CreditDays, c.CreditWarningPct,
		c.DocsValidityMonths, c.Status,
	).Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (r *CustomerRepository) Update(ctx context.Context, q db.DBExecutor, c *CustomerEntity) (*CustomerEntity, error) {
	if c.DocsValidityMonths <= 0 {
		c.DocsValidityMonths = 12
	}
	if c.CreditWarningPct <= 0 {
		c.CreditWarningPct = 70.00
	}

	const sql = `
		UPDATE customers SET
			document_type = $1,
			document = $2,
			person_type = $3,
			name = $4,
			last_name = $5,
			trade_name = $6,
			legal_representative = $7,
			email = $8,
			phone = $9,
			mobile = $10,
			address = $11,
			city = $12,
			vat_responsible = $13,
			fiscal_resp_codes = $14,
			addresses = $15,
			contacts = $16,
			price_tier = $17,
			discount_percent = $18,
			credit_enabled = $19,
			credit_limit = $20,
			credit_days = $21,
			credit_warning_pct = $22,
			docs_validity_months = $23,
			status = $24,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $25 AND deleted_at IS NULL
		RETURNING updated_at
	`
	err := q.QueryRow(ctx, sql,
		c.DocumentType, c.Document, c.PersonType,
		c.Name, c.LastName, c.TradeName, c.LegalRepresentative,
		c.Email, c.Phone, c.Mobile, c.Address, c.City,
		c.VATResponsible, c.FiscalRespCodes, c.Addresses, c.Contacts,
		c.PriceTier, c.DiscountPercent, c.CreditEnabled, c.CreditLimit, c.CreditDays, c.CreditWarningPct,
		c.DocsValidityMonths, c.Status, c.ID,
	).Scan(&c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (r *CustomerRepository) SoftDelete(ctx context.Context, q db.DBExecutor, id int64) error {
	const sql = `
		UPDATE customers SET
			deleted_at = CURRENT_TIMESTAMP,
			status = 'inactive',
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND deleted_at IS NULL
	`
	cmdTag, err := q.Exec(ctx, sql, id)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("cliente no encontrado o ya eliminado")
	}
	return nil
}

// ==========================================
// MÉTODOS PARA DOCUMENTOS ADJUNTOS
// ==========================================

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

func (r *CustomerRepository) ListSelector(ctx context.Context, q db.DBExecutor, companyID int64, search string) ([]dtos.CustomerSelectorResponse, error) {
	where := []string{"c.company_id = $1", "c.deleted_at IS NULL", "c.status = 'active'"}
	args := []interface{}{companyID}
	argIdx := 2

	if strings.TrimSpace(search) != "" {
		where = append(where, fmt.Sprintf("(c.document ILIKE $%d OR c.name ILIKE $%d OR c.trade_name ILIKE $%d)", argIdx, argIdx, argIdx))
		args = append(args, "%"+strings.TrimSpace(search)+"%")
		argIdx++
	}

	whereClause := "WHERE " + strings.Join(where, " AND ")
	sql := fmt.Sprintf(`
		SELECT
			c.id, c.document, c.name, c.trade_name, c.price_tier,
			c.credit_enabled,
			COALESCE(v.available_credit, 0) AS available_credit,
			(c.document = '222222222222' OR c.name ILIKE '%%Consumidor Final%%' OR c.trade_name ILIKE '%%Mostrador%%') AS is_default
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
