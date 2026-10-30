package services

import (
	"context"
	"encoding/json"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/audit/dtos"
	"importadoraApi/src/features/audit/repositories"

	"github.com/jackc/pgx/v5/pgxpool"
)

type AuditService struct {
	pool      *pgxpool.Pool
	auditRepo *repositories.AuditLogQueryRepository
}

func NewAuditService(pool *pgxpool.Pool, auditRepo *repositories.AuditLogQueryRepository) *AuditService {
	return &AuditService{
		pool:      pool,
		auditRepo: auditRepo,
	}
}

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

