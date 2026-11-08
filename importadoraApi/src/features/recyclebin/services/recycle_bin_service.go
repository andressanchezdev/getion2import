package services

// recycle_bin_service.go · reglas de negocio de papelera de reciclaje: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas
// conecta con: los repositories y dtos de papelera de reciclaje; los llama el controller y la conexión llega del contenedor

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	notificationRepos "importadoraApi/src/features/notifications/repositories"
	"importadoraApi/src/features/recyclebin/dtos"
	"importadoraApi/src/features/recyclebin/repositories"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type RecycleBinService struct {
	pool             *pgxpool.Pool
	recycleBinRepo   *repositories.RecycleBinRepository
	auditRepo        *authRepos.AuditRepository
	notificationRepo *notificationRepos.NotificationRepository
}

// NewRecycleBinService crea el servicio con las piezas que necesita para funcionar.
func NewRecycleBinService(
	pool *pgxpool.Pool,
	recycleBinRepo *repositories.RecycleBinRepository,
	auditRepo *authRepos.AuditRepository,
	notificationRepo *notificationRepos.NotificationRepository,
) *RecycleBinService {
	return &RecycleBinService{
		pool:             pool,
		recycleBinRepo:   recycleBinRepo,
		auditRepo:        auditRepo,
		notificationRepo: notificationRepo,
	}
}

// List devuelve los elementos de la papelera paginados según los filtros, limitados a lo que el usuario puede ver.
func (s *RecycleBinService) List(ctx context.Context, actor *middlewares.ActorContext, f dtos.RecycleBinFilterQuery) ([]dtos.RecycleBinItemResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID <= 0 {
			return nil, nil, utils.Forbidden("FORBIDDEN_NO_COMPANY", "El usuario no pertenece a ninguna compañía activa.")
		}
		f.CompanyID = actor.CompanyID // solo su compañía; los registros sin compañía son del superadmin
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

// Restore restaura un elemento de la papelera validando que sea de la compañía del usuario y deja el cambio en auditoría.
func (s *RecycleBinService) Restore(ctx context.Context, actor *middlewares.ActorContext, id int64, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return utils.Internal("Error al iniciar transacción de restauración.", err)
	}
	defer tx.Rollback(ctx)

	if err := s.recycleBinRepo.LockByID(ctx, tx, id); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.NotFound("NOT_FOUND", "El elemento no se encuentra en la papelera de reciclaje.")
		}
		return utils.Internal("Error al bloquear el elemento en papelera.", err)
	}
	item, err := s.recycleBinRepo.FindByID(ctx, tx, id)
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

	if err := s.recycleBinRepo.Restore(ctx, tx, item, actor.ActorID); err != nil {
		return utils.Internal("Error al restaurar elemento.", err)
	}

	if err := s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
		CompanyID: item.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    item.EntityTable,
		EntityID:  &item.EntityID,
		Action:    "RECORD_RESTORED_FROM_TRASH",
		Reason:    fmt.Sprintf("Restauración de '%s' (ID %d) desde papelera de reciclaje", item.EntityLabel, item.EntityID),
		IPAddress: ip,
		UserAgent: ua,
	}); err != nil {
		return utils.Internal("Error al registrar la restauración en auditoría.", err)
	}
	if item.CompanyID != nil {
		body := fmt.Sprintf("El SUPERADMIN restauró el registro '%s'.", item.EntityLabel)
		if err := s.notificationRepo.CreateCompanyAdminNotification(ctx, tx, *item.CompanyID, "Registro restaurado", body, item.EntityTable, item.EntityID); err != nil {
			return utils.Internal("No se pudo completar la restauración ni notificar al administrador.", err)
		}
	}

	return tx.Commit(ctx)
}
