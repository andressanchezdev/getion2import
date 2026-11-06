package repositories

import (
	"context"
	"errors"

	"importadoraApi/src/core/db"
)

type AuditContextChangeRepo struct{}

func NewAuditContextChangeRepo() *AuditContextChangeRepo { return &AuditContextChangeRepo{} }

func (r *AuditContextChangeRepo) CompanyExists(ctx context.Context, q db.DBExecutor, companyID int64) (bool, error) {
	var exists bool
	err := q.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM companies WHERE id = $1 AND deleted_at IS NULL)`, companyID).Scan(&exists)
	return exists, err
}

func (r *AuditContextChangeRepo) Insert(ctx context.Context, q db.DBExecutor, actorID int64, actorType string, fromCompanyID, toCompanyID *int64, toAllCompanies bool, ip, ua string) error {
	if toAllCompanies == (toCompanyID != nil) {
		return errors.New("el destino del cambio de contexto es inconsistente")
	}
	const sql = `
    	INSERT INTO audit_context_change (
    		actor_id, actor_type, from_company_id, to_company_id, to_all_companies, ip, user_agent
    	) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `
	_, err := q.Exec(ctx, sql, actorID, actorType, fromCompanyID, toCompanyID, toAllCompanies, ip, ua)
	return err
}
