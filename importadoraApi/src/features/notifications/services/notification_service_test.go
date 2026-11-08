package services

// notification_service_test · las notificaciones son solo para empleados y administradores: el superadmin y quien no inició sesión se rechazan en listar y en marcar como leída
// (no necesita base de datos: la guarda responde antes de tocarla)

import (
	"context"
	"errors"
	"net/http"
	"testing"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
)

func appStatus(t *testing.T, err error) int {
	t.Helper()
	var app *utils.AppError
	if !errors.As(err, &app) {
		t.Fatalf("se esperaba un AppError y llegó %v", err)
	}
	return app.Status
}

func TestSuperadminAndAnonymousCannotUseNotifications(t *testing.T) {
	svc := &NotificationService{}
	ctx := context.Background()
	superadmin := &middlewares.ActorContext{ActorType: types.ActorSuperadmin, ActorID: 1}

	if _, _, err := svc.List(ctx, superadmin, false, utils.PageParams{Page: 1, PageSize: 10}); appStatus(t, err) != http.StatusForbidden {
		t.Error("el superadmin no debe listar notificaciones (403)")
	}
	if err := svc.MarkAsRead(ctx, superadmin, 1); appStatus(t, err) != http.StatusForbidden {
		t.Error("el superadmin no debe marcar notificaciones (403)")
	}
	if err := svc.MarkAllAsRead(ctx, superadmin); appStatus(t, err) != http.StatusForbidden {
		t.Error("el superadmin no debe marcar todas como leídas (403)")
	}

	if _, _, err := svc.List(ctx, nil, false, utils.PageParams{}); appStatus(t, err) != http.StatusUnauthorized {
		t.Error("sin sesión debe dar 401")
	}
	if err := svc.MarkAsRead(ctx, &middlewares.ActorContext{ActorType: types.ActorEmployee}, 1); appStatus(t, err) != http.StatusUnauthorized {
		t.Error("un actor sin id debe dar 401")
	}
}

func TestRequireRecipientAcceptsEmployeeAndAdmin(t *testing.T) {
	for _, kind := range []types.ActorType{types.ActorEmployee, types.ActorAdmin} {
		if err := requireRecipient(&middlewares.ActorContext{ActorType: kind, ActorID: 5}); err != nil {
			t.Errorf("%s debe poder recibir notificaciones: %v", kind, err)
		}
	}
}
