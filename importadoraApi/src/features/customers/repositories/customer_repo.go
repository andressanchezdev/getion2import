package repositories

// customer_repo.go · acceso a la base de clientes: aquí vive el SQL; cada método recibe la conexión o la transacción
// conecta con: core/db (DBExecutor) y los dtos de clientes; los usan los services de clientes

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

type CustomerRepository struct{}

// NewCustomerRepository crea el repositorio; no guarda estado, cada método recibe la conexión o transacción.
func NewCustomerRepository() *CustomerRepository {
	return &CustomerRepository{}
}

// FindByID busca el cliente por su id (nil si no existe).
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

// FindByCompanyAndDocument busca el cliente por compañía y documento (nil si no existe).
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

// List lista los clientes según los filtros, con su total para paginar.
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

// Create inserta el cliente y devuelve el registro guardado.
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

// Update actualiza los datos de el cliente.
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

// SoftDelete marca el cliente como eliminado (borrado lógico: no se pierde el registro).
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

