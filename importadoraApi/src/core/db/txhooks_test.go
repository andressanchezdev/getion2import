package db

// txhooks_test · los ganchos de WithTx corren antes del COMMIT y, si fallan, revierten el cambio de negocio
// conecta con: txhooks.go y postgres.go (WithTx)
// ojo: las pruebas con base solo corren si TEST_DATABASE_URL está definida (una base creada con startdb.pgsql, nunca la de trabajo)

import (
	"context"
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestHooksNeedWithTx(t *testing.T) {
	ctx := context.Background()
	if err := OnBeforeCommit(ctx, func(context.Context, pgx.Tx) error { return nil }); !errors.Is(err, ErrNoTxContext) {
		t.Fatalf("fuera de WithTx debe dar ErrNoTxContext: %v", err)
	}
	if _, err := TxLocal(ctx, "k", func() any { return 1 }); !errors.Is(err, ErrNoTxContext) {
		t.Fatalf("TxLocal fuera de WithTx debe dar ErrNoTxContext: %v", err)
	}
	if InTx(ctx) {
		t.Fatal("un contexto normal no está en transacción")
	}
	txCtx := withHookRegistry(ctx)
	calls := 0
	for i := 0; i < 3; i++ {
		_ = OnBeforeCommitOnce(txCtx, "una-vez", func(context.Context, pgx.Tx) error { calls++; return nil })
	}
	a, _ := TxLocal(txCtx, "k", func() any { return new(int) })
	b, _ := TxLocal(txCtx, "k", func() any { return new(int) })
	if a != b {
		t.Fatal("TxLocal debe devolver el mismo valor dentro de la transacción")
	}
	if err := runBeforeCommit(txCtx, nil); err != nil || calls != 1 {
		t.Fatalf("OnBeforeCommitOnce debe registrar una sola vez (llamadas: %d, error: %v)", calls, err)
	}
}

func testPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL no está definida")
	}
	pool, err := pgxpool.New(context.Background(), url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	return pool
}

func minStock(t *testing.T, pool *pgxpool.Pool) int {
	var v int
	if err := pool.QueryRow(context.Background(), "SELECT min_stock FROM stock WHERE id = 1").Scan(&v); err != nil {
		t.Fatal(err)
	}
	return v
}

func TestHookRunsBeforeCommitAndFailureRollsBack(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	before := minStock(t, pool)

	// un gancho que falla revierte el UPDATE de negocio
	boom := errors.New("falla el guardado del evento")
	err := WithTx(ctx, pool, func(ctx context.Context, tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, "UPDATE stock SET min_stock = min_stock + 1 WHERE id = 1"); err != nil {
			return err
		}
		return OnBeforeCommit(ctx, func(context.Context, pgx.Tx) error { return boom })
	})
	if !errors.Is(err, boom) || minStock(t, pool) != before {
		t.Fatalf("el gancho que falla debe revertir todo (error: %v, min_stock %d → %d)", err, before, minStock(t, pool))
	}

	// el gancho ve el cambio de la transacción (corre antes del COMMIT, con la misma tx)
	var seen int
	err = WithTx(ctx, pool, func(ctx context.Context, tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, "UPDATE stock SET min_stock = min_stock + 1 WHERE id = 1"); err != nil {
			return err
		}
		return OnBeforeCommit(ctx, func(ctx context.Context, tx pgx.Tx) error {
			return tx.QueryRow(ctx, "SELECT min_stock FROM stock WHERE id = 1").Scan(&seen)
		})
	})
	if err != nil || seen != before+1 || minStock(t, pool) != before+1 {
		t.Fatalf("el gancho debe ver el cambio y confirmarse (visto %d, guardado %d, error %v)", seen, minStock(t, pool), err)
	}
	_, _ = pool.Exec(ctx, "UPDATE stock SET min_stock = $1 WHERE id = 1", before)

	// si fn falla, los ganchos no corren
	ran := false
	_ = WithTx(ctx, pool, func(ctx context.Context, tx pgx.Tx) error {
		_ = OnBeforeCommit(ctx, func(context.Context, pgx.Tx) error { ran = true; return nil })
		return errors.New("falla el negocio")
	})
	if ran {
		t.Fatal("si la lógica del servicio falla, el gancho no debe correr")
	}
}

func TestNoManualBeginInFeatures(t *testing.T) {
	featuresDir := filepath.Join("..", "..", "features")
	err := filepath.WalkDir(featuresDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return err
		}
		raw, rerr := os.ReadFile(path)
		if rerr != nil {
			return rerr
		}
		text := string(raw)
		if strings.Contains(text, ".Begin(") || strings.Contains(text, "BeginTx(") {
			t.Errorf("%s usa .Begin( o BeginTx( manual; todas las transacciones en src/features deben pasar por db.WithTx", path)
		}
		return nil
	})
	if err != nil {
		t.Fatalf("error recorriendo src/features: %v", err)
	}
}
