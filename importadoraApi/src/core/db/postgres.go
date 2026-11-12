package db

// postgres.go · conexión directa a PostgreSQL con pgx y ayuda para correr una función dentro de una transacción
// conecta con: core/config (DSN); los services usan WithTx para sus transacciones

import (
	"context"
	"fmt"
	"time"

	"importadoraApi/src/core/config"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect inicializa el pool de conexiones hacia PostgreSQL y verifica conectividad.
func Connect(ctx context.Context, cfg *config.Config) (*pgxpool.Pool, error) {
	poolCfg, err := pgxpool.ParseConfig(cfg.DatabaseURL())
	if err != nil {
		return nil, fmt.Errorf("error al interpretar DSN de PostgreSQL: %w", err)
	}

	poolCfg.MaxConns = cfg.DBMaxConns
	poolCfg.MinConns = cfg.DBMinConns
	poolCfg.MaxConnLifetime = 45 * time.Minute
	poolCfg.MaxConnIdleTime = 15 * time.Minute
	poolCfg.HealthCheckPeriod = 30 * time.Second

	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return nil, fmt.Errorf("error al abrir pool PostgreSQL: %w", err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("no se pudo conectar con PostgreSQL (%s:%d/%s): %w", cfg.DBHost, cfg.DBPort, cfg.DBName, err)
	}

	return pool, nil
}

// WithTx ejecuta fn dentro de una transacción ACID con COMMIT o ROLLBACK automático.
// fn recibe un contexto propio de la transacción: los ganchos OnBeforeCommit que se registren con él (por ejemplo los eventos
// del websocket) corren después de fn y antes del COMMIT; si alguno falla, se hace ROLLBACK.
// ojo: dentro de fn hay que usar el ctx que recibe, no el de afuera, para que los ganchos queden en esta transacción
func WithTx(ctx context.Context, pool *pgxpool.Pool, fn func(ctx context.Context, tx pgx.Tx) error) (err error) {
	tx, err := pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("no se pudo iniciar la transacción: %w", err)
	}

	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback(ctx)
			panic(p)
		} else if err != nil {
			_ = tx.Rollback(ctx)
		} else {
			err = tx.Commit(ctx)
		}
	}()

	txCtx := withHookRegistry(ctx)
	if err = fn(txCtx, tx); err != nil {
		return err
	}
	err = runBeforeCommit(txCtx, tx)
	return err
}

// WithTxValue es WithTx para cuando la operación devuelve un valor (por ejemplo la fila recién creada); si falla, el valor es el cero de T.
func WithTxValue[T any](ctx context.Context, pool *pgxpool.Pool, fn func(ctx context.Context, tx pgx.Tx) (T, error)) (T, error) {
	var out T
	err := WithTx(ctx, pool, func(ctx context.Context, tx pgx.Tx) error {
		v, err := fn(ctx, tx)
		if err != nil {
			return err
		}
		out = v
		return nil
	})
	if err != nil {
		var zero T
		return zero, err
	}
	return out, nil
}
