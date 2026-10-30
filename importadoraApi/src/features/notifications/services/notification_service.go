package services

import (
	"context"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/notifications/dtos"
	"importadoraApi/src/features/notifications/repositories"

	"github.com/jackc/pgx/v5/pgxpool"
)

type NotificationService struct {
	pool             *pgxpool.Pool
	notificationRepo *repositories.NotificationRepository
}

func NewNotificationService(pool *pgxpool.Pool, notificationRepo *repositories.NotificationRepository) *NotificationService {
	return &NotificationService{
		pool:             pool,
		notificationRepo: notificationRepo,
	}
}

func (s *NotificationService) List(ctx context.Context, actor *middlewares.ActorContext, unreadOnly bool, params utils.PageParams) ([]dtos.NotificationResponse, *utils.PaginatorMetadata, error) {
	if actor == nil || actor.ActorID <= 0 {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	filter := dtos.NotificationFilterQuery{
		EmployeeID: actor.ActorID,
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

func (s *NotificationService) MarkAsRead(ctx context.Context, actor *middlewares.ActorContext, id int64) error {
	if actor == nil || actor.ActorID <= 0 {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	return s.notificationRepo.MarkAsRead(ctx, s.pool, id, actor.ActorID)
}

func (s *NotificationService) MarkAllAsRead(ctx context.Context, actor *middlewares.ActorContext) error {
	if actor == nil || actor.ActorID <= 0 {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	return s.notificationRepo.MarkAllAsRead(ctx, s.pool, actor.ActorID)
}

