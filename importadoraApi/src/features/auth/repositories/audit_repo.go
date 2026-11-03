package repositories

// audit_repo.go · acceso a la base de autenticación y sesiones: aquí vive el SQL; cada método recibe la conexión o la transacción
// conecta con: core/db (DBExecutor) y los dtos de autenticación y sesiones; los usan los services de autenticación y sesiones

import (
	"context"
	"encoding/json"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/types"
)

// AuditLogInput estructura para registrar eventos inmutables en audit_logs.
type AuditLogInput struct {
	CompanyID *int64
	ActorType types.ActorType
	ActorID   int64
	Entity    string
	EntityID  *int64
	Action    string
	Reason    string
	Changes   any
	IPAddress string
	UserAgent string
}

type AuditRepository struct{}

// NewAuditRepository crea el repositorio; no guarda estado, cada método recibe la conexión o transacción.
func NewAuditRepository() *AuditRepository {
	return &AuditRepository{}
}

// Insert escribe una fila inmutable en audit_logs asociando la columna exacta según el ActorType.
func (r *AuditRepository) Insert(ctx context.Context, q db.DBExecutor, in AuditLogInput) error {
	var (
		empID *int64
		admID *int64
		supID *int64
	)

	if in.ActorID > 0 {
		id := in.ActorID
		switch in.ActorType {
		case types.ActorEmployee:
			empID = &id
		case types.ActorAdmin:
			admID = &id
		case types.ActorSuperadmin:
			supID = &id
		}
	}

	changesJSON := []byte("{}")
	if in.Changes != nil {
		if raw, err := json.Marshal(in.Changes); err == nil && len(raw) > 0 && string(raw) != "null" {
			changesJSON = raw
		}
	}

	var reasonPtr *string
	if in.Reason != "" {
		reasonPtr = &in.Reason
	}

	query := `
		INSERT INTO audit_logs (
			company_id, superadmin_id, admin_id, employee_id,
			entity, entity_id, action, reason, changes, ip_address, user_agent
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`

	_, err := q.Exec(
		ctx,
		query,
		in.CompanyID,
		supID,
		admID,
		empID,
		in.Entity,
		in.EntityID,
		in.Action,
		reasonPtr,
		changesJSON,
		in.IPAddress,
		in.UserAgent,
	)
	return err
}

