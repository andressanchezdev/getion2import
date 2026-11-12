package services

// ticket_service.go · emite el ticket de un solo uso para abrir el websocket del servicio importadoraRealtime
// conecta con: ticket_repo (guarda el sha256), core/middlewares (actor de la sesión) y core/config (TTL y REALTIME_WS_URL)
// ojo: 32 bytes de crypto/rand en base64url; solo se guarda su sha256 y vence a los TTL segundos. Máximo 5 tickets por minuto por sesión
// (contador en memoria: con una sola réplica de la API alcanza; con varias réplicas el tope es por réplica)

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"sync"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/realtime/dtos"
	"importadoraApi/src/features/realtime/repositories"
)

// TicketsPerMinute es el máximo de tickets que una sesión puede pedir en un minuto.
const TicketsPerMinute = 5

// TicketStore es lo que el servicio necesita del repositorio (se cambia por uno falso en las pruebas).
type TicketStore interface {
	Insert(ctx context.Context, q db.DBExecutor, t repositories.TicketRecord) error
}

// TicketService emite tickets para el websocket.
type TicketService struct {
	db    db.DBExecutor
	store TicketStore
	ttl   time.Duration
	wsURL string
	now   func() time.Time

	mu     sync.Mutex
	issued map[int64][]time.Time // sesión → momentos de los tickets del último minuto
}

// NewTicketService crea el servicio.
func NewTicketService(q db.DBExecutor, store TicketStore, ttl time.Duration, wsURL string) *TicketService {
	return &TicketService{db: q, store: store, ttl: ttl, wsURL: wsURL, now: time.Now, issued: map[int64][]time.Time{}}
}

// Issue emite un ticket para el actor de la sesión.
func (s *TicketService) Issue(ctx context.Context, actor *middlewares.ActorContext) (*dtos.TicketResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	if actor.SessionID <= 0 {
		return nil, utils.Unauthorized("SESSION_REQUIRED", "El token no pertenece a una sesión activa; vuelve a iniciar sesión.")
	}
	now := s.now()
	if !s.allow(actor.SessionID, now) {
		return nil, utils.TooManyRequests("TOO_MANY_TICKETS", "Demasiados intentos de conexión en tiempo real; espera un minuto.")
	}

	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return nil, utils.Internal("No se pudo generar el ticket.", err)
	}
	ticket := base64.RawURLEncoding.EncodeToString(raw)
	expires := now.Add(s.ttl)
	record := repositories.TicketRecord{
		Hash:        HashTicket(ticket),
		ActorType:   string(actor.ActorType),
		ActorID:     actor.ActorID,
		CompanyID:   actor.CompanyID,
		WarehouseID: actor.WarehouseID,
		SessionID:   actor.SessionID,
		ExpiresAt:   expires,
	}
	if err := s.store.Insert(ctx, s.db, record); err != nil {
		return nil, utils.Internal("No se pudo guardar el ticket.", err)
	}
	return &dtos.TicketResponse{Ticket: ticket, WsURL: s.wsURL, ExpiresAt: expires}, nil
}

// HashTicket es el sha256 en hex con el que se guarda y se busca un ticket (importadoraRealtime calcula el mismo).
func HashTicket(ticket string) string {
	sum := sha256.Sum256([]byte(ticket))
	return hex.EncodeToString(sum[:])
}

// allow aplica el límite de tickets por minuto de una sesión.
func (s *TicketService) allow(sessionID int64, now time.Time) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	window := now.Add(-time.Minute)
	recent := s.issued[sessionID][:0]
	for _, t := range s.issued[sessionID] {
		if t.After(window) {
			recent = append(recent, t)
		}
	}
	if len(recent) >= TicketsPerMinute {
		s.issued[sessionID] = recent
		return false
	}
	s.issued[sessionID] = append(recent, now)
	return true
}
