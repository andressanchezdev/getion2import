package services

// ticket_service_test · el ticket se guarda solo como sha256, vence a los TTL segundos y hay máximo 5 por minuto por sesión
// conecta con: ticket_service.go (con un repositorio falso: no necesita base de datos)

import (
	"context"
	"encoding/base64"
	"errors"
	"testing"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/realtime/repositories"
)

type fakeStore struct{ saved []repositories.TicketRecord }

func (f *fakeStore) Insert(_ context.Context, _ db.DBExecutor, t repositories.TicketRecord) error {
	f.saved = append(f.saved, t)
	return nil
}

func newTestService() (*TicketService, *fakeStore, *time.Time) {
	store := &fakeStore{}
	svc := NewTicketService(nil, store, 30*time.Second, "ws://localhost:3002/ws")
	now := time.Date(2026, 11, 11, 15, 0, 0, 0, time.UTC)
	svc.now = func() time.Time { return now }
	return svc, store, &now
}

func employee(session int64) *middlewares.ActorContext {
	company, warehouse := int64(1), int64(1)
	return &middlewares.ActorContext{ActorType: types.ActorEmployee, ActorID: 3, CompanyID: &company, WarehouseID: &warehouse, SessionID: session}
}

func TestTicketIsStoredOnlyAsHash(t *testing.T) {
	svc, store, now := newTestService()
	res, err := svc.Issue(context.Background(), employee(41))
	if err != nil {
		t.Fatal(err)
	}
	raw, err := base64.RawURLEncoding.DecodeString(res.Ticket)
	if err != nil || len(raw) != 32 {
		t.Fatalf("el ticket debe ser 32 bytes en base64url: %q (%v)", res.Ticket, err)
	}
	saved := store.saved[0]
	if saved.Hash == res.Ticket || saved.Hash != HashTicket(res.Ticket) || len(saved.Hash) != 64 {
		t.Fatalf("debe guardarse el sha256 hex del ticket, nunca el ticket: %+v", saved)
	}
	if !res.ExpiresAt.Equal(now.Add(30*time.Second)) || !saved.ExpiresAt.Equal(res.ExpiresAt) {
		t.Fatalf("debe vencer a los 30 s: %v", res.ExpiresAt)
	}
	if saved.SessionID != 41 || saved.ActorType != "employee" || saved.ActorID != 3 || *saved.CompanyID != 1 || res.WsURL == "" {
		t.Fatalf("el ticket no lleva el actor de la sesión: %+v", saved)
	}
}

func TestTicketRateLimitPerSession(t *testing.T) {
	svc, _, now := newTestService()
	for i := 0; i < TicketsPerMinute; i++ {
		if _, err := svc.Issue(context.Background(), employee(7)); err != nil {
			t.Fatalf("ticket %d: %v", i+1, err)
		}
	}
	_, err := svc.Issue(context.Background(), employee(7))
	var appErr *utils.AppError
	if !errors.As(err, &appErr) || appErr.Status != 429 {
		t.Fatalf("el ticket %d en un minuto debe dar 429: %v", TicketsPerMinute+1, err)
	}
	if _, err := svc.Issue(context.Background(), employee(8)); err != nil {
		t.Fatalf("otra sesión no comparte el límite: %v", err)
	}
	*now = now.Add(61 * time.Second)
	if _, err := svc.Issue(context.Background(), employee(7)); err != nil {
		t.Fatalf("pasado el minuto vuelve a poder: %v", err)
	}
}

func TestTicketNeedsSession(t *testing.T) {
	svc, _, _ := newTestService()
	if _, err := svc.Issue(context.Background(), nil); err == nil {
		t.Error("sin actor no hay ticket")
	}
	if _, err := svc.Issue(context.Background(), employee(0)); err == nil {
		t.Error("sin sesión no hay ticket")
	}
}
