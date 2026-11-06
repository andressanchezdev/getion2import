package services

// notification_service.go · reglas de negocio de notificaciones: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas
// conecta con: los repositories y dtos de notificaciones; los llama el controller y la conexión llega del contenedor

import (
	"context"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/notifications/dtos"
	"importadoraApi/src/features/notifications/repositories"

	"github.com/jackc/pgx/v5/pgxpool"
)

type NotificationService struct {
	pool             *pgxpool.Pool
	notificationRepo *repositories.NotificationRepository
}

// NewNotificationService crea el servicio con las piezas que necesita para funcionar.
func NewNotificationService(pool *pgxpool.Pool, notificationRepo *repositories.NotificationRepository) *NotificationService {
	return &NotificationService{
		pool:             pool,
		notificationRepo: notificationRepo,
	}
}

// List devuelve las notificaciones paginados según los filtros, limitados a lo que el usuario puede ver.
func (s *NotificationService) List(ctx context.Context, actor *middlewares.ActorContext, unreadOnly bool, params utils.PageParams) ([]dtos.NotificationResponse, *utils.PaginatorMetadata, error) {
	if actor == nil || actor.ActorID <= 0 {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	if actor.ActorType == types.ActorSuperadmin {
		return nil, nil, utils.Forbidden("NOTIFICATIONS_UNAVAILABLE", "Las notificaciones están disponibles para administradores y empleados.")
	}
	filter := dtos.NotificationFilterQuery{
		ActorType:  string(actor.ActorType),
		ActorID:    actor.ActorID,
		UnreadOnly: unreadOnly,
		Page:       params.Page,
		PageSize:   params.PageSize,
	}

	list, total, err := s.notificationRepo.List(ctx, s.pool, filter)
	if err != nil {
		return nil, nil, utils.Internal("Error al listar notificaciones.", err)
	}

	meta := utils.BuildMeta(params.Page, params.PageSize, total)
	resp := make([]dtos.NotificationResponse, 0, len(list))
	for _, n := range list {
		resp = append(resp, dtos.NotificationResponse{
			ID:         n.ID,
			EmployeeID: n.EmployeeID,
			AdminID:    n.AdminID,
			Kind:       n.Kind,
			Title:      n.Title,
			Body:       n.Body,
			Entity:     n.Entity,
			EntityID:   n.EntityID,
			ReadAt:     n.ReadAt,
			CreatedAt:  n.CreatedAt,
		})
	}

	return resp, &meta, nil
}

// MarkAsRead marca una notificación como leída, validando que sea del usuario.
func (s *NotificationService) MarkAsRead(ctx context.Context, actor *middlewares.ActorContext, id int64) error {
	if actor == nil || actor.ActorID <= 0 {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	return s.notificationRepo.MarkAsRead(ctx, s.pool, string(actor.ActorType), id, actor.ActorID)
}

// MarkAllAsRead marca como leídas todas las notificaciones del usuario.
func (s *NotificationService) MarkAllAsRead(ctx context.Context, actor *middlewares.ActorContext) error {
	if actor == nil || actor.ActorID <= 0 {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	return s.notificationRepo.MarkAllAsRead(ctx, s.pool, string(actor.ActorType), actor.ActorID)
}
