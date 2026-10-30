package services

import (
	"context"
	"encoding/json"
	"fmt"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/recyclebin/dtos"
	"importadoraApi/src/features/recyclebin/repositories"

	"github.com/jackc/pgx/v5/pgxpool"
)

type RecycleBinService struct {
	pool           *pgxpool.Pool
	recycleBinRepo *repositories.RecycleBinRepository
	auditRepo      *authRepos.AuditRepository
}

func NewRecycleBinService(
	pool *pgxpool.Pool,
	recycleBinRepo *repositories.RecycleBinRepository,
	auditRepo *authRepos.AuditRepository,
) *RecycleBinService {
	return &RecycleBinService{
		pool:           pool,
		recycleBinRepo: recycleBinRepo,
		auditRepo:      auditRepo,
	}
}

func (s *RecycleBinService) List(ctx context.Context, actor *middlewares.ActorContext, f dtos.RecycleBinFilterQuery) ([]dtos.RecycleBinItemResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		f.CompanyID = actor.CompanyID
	}

	list, total, err := s.recycleBinRepo.List(ctx, s.pool, f)
	if err != nil {
		return nil, nil, utils.Internal("Error al listar papelera de reciclaje.", err)
	}

	meta := utils.BuildMeta(f.Page, f.PageSize, total)
	resp := make([]dtos.RecycleBinItemResponse, 0, len(list))
	for _, it := range list {
		var raw json.RawMessage
		if len(it.EntityData) > 0 {
			raw = json.RawMessage(it.EntityData)
		}
		resp = append(resp, dtos.RecycleBinItemResponse{
			ID:                  it.ID,
			CompanyID:           it.CompanyID,
			EntityTable:         it.EntityTable,
			EntityID:            it.EntityID,
			EntityLabel:         it.EntityLabel,
			EntityData:          raw,
			DeletedByActorType:  it.DeletedByActorType,
			DeletedByActorID:    it.DeletedByActorID,
			DeletedByActorName:  it.DeletedByActorName,
			DeletedAt:           it.DeletedAt,
			IsRestored:          it.IsRestored,
			RestoredAt:          it.RestoredAt,
			RestoredByActorID:   it.RestoredByActorID,
			RestoredByActorName: it.RestoredByActorName,
		})
	}

	return resp, &meta, nil
}

func (s *RecycleBinService) Restore(ctx context.Context, actor *middlewares.ActorContext, id int64, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	item, err := s.recycleBinRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return utils.Internal("Error al consultar elemento en papelera.", err)
	}
	if item == nil {
		return utils.NotFound("NOT_FOUND", "El elemento no se encuentra en la papelera de reciclaje.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || item.CompanyID == nil || *actor.CompanyID != *item.CompanyID {
			return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para restaurar elementos de esta compañía.")
		}
	}

	if item.IsRestored {
		return utils.BadRequest("ALREADY_RESTORED", "Este elemento ya fue restaurado previamente.")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return utils.Internal("Error al iniciar transacción de restauración.", err)
	}
	defer tx.Rollback(ctx)

	if err := s.recycleBinRepo.Restore(ctx, tx, item, actor.ActorID); err != nil {
		return utils.Internal("Error al restaurar elemento.", err)
	}

	_ = s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
		CompanyID: item.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    item.EntityTable,
		EntityID:  &item.EntityID,
		Action:    "RECORD_RESTORED_FROM_TRASH",
		Reason:    fmt.Sprintf("Restauración de '%s' (ID %d) desde papelera de reciclaje", item.EntityLabel, item.EntityID),
		IPAddress: ip,
		UserAgent: ua,
	})

	return tx.Commit(ctx)
}

