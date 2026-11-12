package events

// actor.go · quién hizo el cambio: el actor de la petición (lo deja Authenticate en el context.Context) con su nombre para mostrar
// conecta con: core/middlewares (ActorFrom, RequestIDFrom) y buffer.go (completa actor y correlationId de cada evento al guardar)
// ojo: el nombre se busca UNA vez por actor y se guarda en memoria 10 minutos; sin actor (tareas programadas) el evento sale como «system»

import (
	"context"
	"fmt"
	"sync"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
)

const nameTTL = 10 * time.Minute

// SystemActor es el actor de los eventos que no salen de una petición de usuario.
var SystemActor = Actor{Type: "system", Name: "Sistema"}

type cachedName struct {
	name    string
	expires time.Time
}

// nameCache guarda «tipo:id» → nombre completo, para no consultar en cada evento.
type nameCache struct {
	mu    sync.Mutex
	names map[string]cachedName
	now   func() time.Time
}

func newNameCache() *nameCache {
	return &nameCache{names: map[string]cachedName{}, now: time.Now}
}

var actorTables = map[types.ActorType]string{
	types.ActorEmployee:   "employees",
	types.ActorAdmin:      "admins",
	types.ActorSuperadmin: "superadmins",
}

// resolve devuelve el nombre del actor (de la caché o de la BD, con la misma transacción).
func (c *nameCache) resolve(ctx context.Context, q db.DBExecutor, actorType types.ActorType, actorID int64) string {
	key := fmt.Sprintf("%s:%d", actorType, actorID)
	c.mu.Lock()
	hit, ok := c.names[key]
	c.mu.Unlock()
	if ok && c.now().Before(hit.expires) {
		return hit.name
	}
	name := ""
	if table, known := actorTables[actorType]; known && q != nil {
		_ = q.QueryRow(ctx, "SELECT COALESCE(full_name, '') FROM "+table+" WHERE id = $1", actorID).Scan(&name)
	}
	c.mu.Lock()
	c.names[key] = cachedName{name: name, expires: c.now().Add(nameTTL)}
	c.mu.Unlock()
	return name
}

// actorFromContext devuelve el actor de la petición con su nombre, o SystemActor si no hay petición autenticada.
func (c *nameCache) actorFromContext(ctx context.Context, q db.DBExecutor) Actor {
	actor := middlewares.ActorFrom(ctx)
	if actor == nil {
		return SystemActor
	}
	id := actor.ActorID
	return Actor{Type: string(actor.ActorType), ID: &id, Name: c.resolve(ctx, q, actor.ActorType, actor.ActorID)}
}
