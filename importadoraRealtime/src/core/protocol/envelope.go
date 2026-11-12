package protocol

// envelope.go · sobre v1: StoredEvent (fila de realtime_events, lo que el hub necesita para enrutar) y Envelope (lo que se escribe en el socket)
// conecta con: features/events (lo lee de la BD, E5), core/hub (decide a quién va) y features/connection (lo envía)
// ojo: el cuerpo (payload) viaja sin interpretarse; solo control_events.go (E5) decodifica los tres tipos que el servicio debe actuar

import (
	"encoding/json"
	"time"
)

// Version es la versión del contrato que habla el servicio.
const Version = 1

// Actor es quién hizo el cambio.
type Actor struct {
	Type string `json:"type"` // employee | admin | superadmin | system
	ID   *int64 `json:"id"`
	Name string `json:"name"`
}

// SystemActor firma los mensajes que genera este servicio.
var SystemActor = Actor{Type: "system", Name: "importadoraRealtime"}

// StoredEvent es una fila de realtime_events.
type StoredEvent struct {
	Seq           int64
	ID            string
	Type          string
	CompanyID     *int64
	WarehouseIDs  []int64
	ActorChannel  *string // "employee:12" en eventos personales
	Platform      bool
	Permissions   []string
	Actor         Actor
	CorrelationID *string
	Payload       json.RawMessage
	OccurredAt    time.Time
}

// Envelope es el mensaje del servidor al cliente (mismo formato que RealtimeEnvelope del front y envelope.schema.json).
type Envelope struct {
	V             int             `json:"v"`
	Seq           int64           `json:"seq"`
	ID            string          `json:"id"`
	Type          string          `json:"type"`
	OccurredAt    time.Time       `json:"occurredAt"`
	CompanyID     *int64          `json:"companyId"`
	WarehouseIDs  []int64         `json:"warehouseIds"`
	Actor         Actor           `json:"actor"`
	CorrelationID string          `json:"correlationId,omitempty"`
	Data          json.RawMessage `json:"data"`
}

// Envelope convierte la fila en el sobre que se envía.
func (e StoredEvent) Envelope() Envelope {
	warehouses := e.WarehouseIDs
	if warehouses == nil {
		warehouses = []int64{}
	}
	correlation := ""
	if e.CorrelationID != nil {
		correlation = *e.CorrelationID
	}
	return Envelope{V: Version, Seq: e.Seq, ID: e.ID, Type: e.Type, OccurredAt: e.OccurredAt.UTC(), CompanyID: e.CompanyID,
		WarehouseIDs: warehouses, Actor: e.Actor, CorrelationID: correlation, Data: e.Payload}
}

// Encode serializa el sobre (el hub lo hace UNA vez por evento y reparte los mismos bytes).
func (e Envelope) Encode() ([]byte, error) { return json.Marshal(e) }
