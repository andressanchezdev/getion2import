package services

// audit_service.go · reglas de negocio de auditoría: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas
// conecta con: los repositories y dtos de auditoría; los llama el controller y la conexión llega del contenedor

import (
	"context"
	"encoding/json"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/audit/dtos"
	"importadoraApi/src/features/audit/repositories"
	authRepos "importadoraApi/src/features/auth/repositories"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AuditService struct {
	pool           *pgxpool.Pool
	auditRepo      *repositories.AuditLogQueryRepository
	contextRepo    *repositories.AuditContextChangeRepo
	writeAuditRepo *authRepos.AuditRepository
}

// NewAuditService crea el servicio con las piezas que necesita para funcionar.
func NewAuditService(
	pool *pgxpool.Pool,
	auditRepo *repositories.AuditLogQueryRepository,
	contextRepo *repositories.AuditContextChangeRepo,
	writeAuditRepo *authRepos.AuditRepository,
) *AuditService {
	return &AuditService{
		pool:           pool,
		auditRepo:      auditRepo,
		contextRepo:    contextRepo,
		writeAuditRepo: writeAuditRepo,
	}
}

func (s *AuditService) LogContextChange(ctx context.Context, actor *middlewares.ActorContext, req dtos.ContextChangeRequest, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	if actor.ActorType != types.ActorSuperadmin {
		return utils.Forbidden("FORBIDDEN_SUPERADMIN", "Solo el SUPERADMIN puede cambiar el contexto de compañía.")
	}
	if req.FromCompanyID != nil && *req.FromCompanyID <= 0 {
		return utils.BadRequest("INVALID_FROM_COMPANY", "La compañía de origen no es válida.")
	}
	if req.ToCompanyID != nil && *req.ToCompanyID <= 0 {
		return utils.BadRequest("INVALID_TO_COMPANY", "La compañía de destino no es válida.")
	}
	if req.ToAllCompanies == (req.ToCompanyID != nil) {
		return utils.BadRequest("INVALID_CONTEXT_TARGET", "El destino debe ser una compañía o todas las compañías.")
	}

	if req.FromCompanyID != nil {
		exists, err := s.contextRepo.CompanyExists(ctx, s.pool, *req.FromCompanyID)
		if err != nil {
			return utils.Internal("No se pudo validar la compañía de origen.", err)
		}
		if !exists {
			return utils.BadRequest("INVALID_FROM_COMPANY", "La compañía de origen no existe.")
		}
	}
	if req.ToCompanyID != nil {
		exists, err := s.contextRepo.CompanyExists(ctx, s.pool, *req.ToCompanyID)
		if err != nil {
			return utils.Internal("No se pudo validar la compañía de destino.", err)
		}
		if !exists {
			return utils.BadRequest("INVALID_TO_COMPANY", "La compañía de destino no existe.")
		}
	}

	err := db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		if err := s.contextRepo.Insert(ctx, tx, actor.ActorID, string(actor.ActorType), req.FromCompanyID, req.ToCompanyID, req.ToAllCompanies, ip, ua); err != nil {
			return err
		}
		auditCompanyID := req.ToCompanyID
		if auditCompanyID == nil {
			auditCompanyID = req.FromCompanyID
		}
		return s.writeAuditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
			CompanyID: auditCompanyID,
			ActorType: actor.ActorType,
			ActorID:   actor.ActorID,
			Entity:    "company_context",
			Action:    "COMPANY_CONTEXT_CHANGED",
			Reason:    "Cambio de contexto multiempresa",
			Changes: map[string]any{
				"fromCompanyId":  req.FromCompanyID,
				"toCompanyId":    req.ToCompanyID,
				"toAllCompanies": req.ToAllCompanies,
			},
			IPAddress: ip,
			UserAgent: ua,
		})
	})
	if err != nil {
		return utils.Internal("No se pudo registrar el cambio de contexto.", err)
	}
	return nil
}

// List devuelve los movimientos de auditoría paginados según los filtros, limitados a lo que el usuario puede ver.
func (s *AuditService) List(ctx context.Context, actor *middlewares.ActorContext, f dtos.AuditLogFilterQuery) ([]dtos.AuditLogResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		f.CompanyID = actor.CompanyID
	}

	list, total, err := s.auditRepo.List(ctx, s.pool, f)
	if err != nil {
		return nil, nil, utils.Internal("Error al consultar logs de auditoría.", err)
	}

	meta := utils.BuildMeta(f.Page, f.PageSize, total)
	resp := make([]dtos.AuditLogResponse, 0, len(list))
	for _, it := range list {
		var raw json.RawMessage
		if len(it.Changes) > 0 {
			raw = json.RawMessage(it.Changes)
		}
		resp = append(resp, dtos.AuditLogResponse{
			ID:        it.ID,
			CompanyID: it.CompanyID,
			ActorType: it.ActorType,
			ActorID:   it.ActorID,
			ActorName: it.ActorName,
			Entity:    it.Entity,
			EntityID:  it.EntityID,
			Action:    it.Action,
			Reason:    it.Reason,
			Changes:   raw,
			IPAddress: it.IPAddress,
			UserAgent: it.UserAgent,
			CreatedAt: it.CreatedAt,
		})
	}

	return resp, &meta, nil
}
