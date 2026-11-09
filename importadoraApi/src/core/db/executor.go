package db

// executor.go · DBExecutor: interfaz común del pool y de las transacciones, para que un repositorio acepte cualquiera de los dos
// conecta con: todos los repositories de cada módulo

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// DBExecutor abstrae *pgxpool.Pool y pgx.Tx para repositorios transaccionales
type DBExecutor interface {
	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}
