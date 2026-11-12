package db

// txhooks.go · ganchos que corren dentro de la transacción de WithTx, justo antes del COMMIT
// conecta con: postgres.go (WithTx crea el registro y los ejecuta) y core/events (registra ahí el guardado de los eventos del websocket)
// ojo: así core/db no depende de core/events; si un gancho falla, WithTx hace ROLLBACK y la operación de negocio no queda (decisión 9)

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

// BeforeCommit es una función que corre con la misma transacción, después de la lógica del servicio y antes del COMMIT.
type BeforeCommit func(ctx context.Context, tx pgx.Tx) error

// ErrNoTxContext: se pidió registrar un gancho con un contexto que no viene de WithTx.
var ErrNoTxContext = errors.New("db: el contexto no pertenece a una transacción de WithTx")

type txHooksKey struct{}

type hookRegistry struct {
	hooks  []BeforeCommit
	keys   map[any]bool
	values map[any]any // datos propios de la transacción (por ejemplo el buffer de eventos)
}

// withHookRegistry devuelve un contexto con un registro de ganchos vacío para una transacción.
func withHookRegistry(ctx context.Context) context.Context {
	return context.WithValue(ctx, txHooksKey{}, &hookRegistry{keys: map[any]bool{}, values: map[any]any{}})
}

// OnBeforeCommit agrega un gancho a la transacción del contexto. Sin WithTx devuelve ErrNoTxContext.
func OnBeforeCommit(ctx context.Context, fn BeforeCommit) error {
	reg, ok := ctx.Value(txHooksKey{}).(*hookRegistry)
	if !ok {
		return ErrNoTxContext
	}
	reg.hooks = append(reg.hooks, fn)
	return nil
}

// OnBeforeCommitOnce registra el gancho solo la primera vez que se llama con esa clave en la transacción
// (core/events lo usa para guardar todos los eventos de la transacción en un solo paso).
func OnBeforeCommitOnce(ctx context.Context, key any, fn BeforeCommit) error {
	reg, ok := ctx.Value(txHooksKey{}).(*hookRegistry)
	if !ok {
		return ErrNoTxContext
	}
	if reg.keys[key] {
		return nil
	}
	reg.keys[key] = true
	reg.hooks = append(reg.hooks, fn)
	return nil
}

// TxLocal devuelve el valor guardado con esa clave en la transacción del contexto, creándolo con init la primera vez.
// Sin WithTx devuelve ErrNoTxContext.
func TxLocal(ctx context.Context, key any, init func() any) (any, error) {
	reg, ok := ctx.Value(txHooksKey{}).(*hookRegistry)
	if !ok {
		return nil, ErrNoTxContext
	}
	if v, ok := reg.values[key]; ok {
		return v, nil
	}
	v := init()
	reg.values[key] = v
	return v, nil
}

// InTx dice si el contexto viene de WithTx.
func InTx(ctx context.Context) bool {
	_, ok := ctx.Value(txHooksKey{}).(*hookRegistry)
	return ok
}

// runBeforeCommit ejecuta los ganchos en el orden en que se registraron y se detiene en el primer error.
func runBeforeCommit(ctx context.Context, tx pgx.Tx) error {
	reg, ok := ctx.Value(txHooksKey{}).(*hookRegistry)
	if !ok {
		return nil
	}
	for _, hook := range reg.hooks {
		if err := hook(ctx, tx); err != nil {
			return err
		}
	}
	return nil
}
