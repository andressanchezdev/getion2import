package db

// gorm.go · conexión a la base: abre el pool, mide su latencia y lo cierra al apagar
// conecta con: core/config (DSN) y core/bootstrap (la entrega a los repositorios)

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"importadoraApi/src/core/config"

	"github.com/jackc/pgx/v5/pgxpool"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"gorm.io/gorm/schema"
)

// Database encapsula la instancia de GORM y el pool nativo de conexiones pgxpool.
type Database struct {
	ORM  *gorm.DB
	SQL  *sql.DB
	Pool *pgxpool.Pool
}

// ConnectDatabase inicializa tanto GORM como el pool nativo pgxpool con validación y pooling configurado.
func ConnectDatabase(ctx context.Context, cfg *config.Config) (*Database, error) {
	pool, err := Connect(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("error al conectar pgxpool: %w", err)
	}

	gormDb, err := ConnectGORM(cfg)
	if err != nil {
		pool.Close()
		return nil, fmt.Errorf("error al conectar GORM: %w", err)
	}

	gormDb.Pool = pool
	// Auto-migración idempotente de columnas y tablas requeridas
	_, _ = pool.Exec(ctx, "ALTER TABLE products ADD COLUMN IF NOT EXISTS is_new BOOLEAN NOT NULL DEFAULT FALSE;")
	_, _ = pool.Exec(ctx, "ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS manager_employee_id BIGINT;")
	_, _ = pool.Exec(ctx, "ALTER TABLE warehouse_locations ADD COLUMN IF NOT EXISTS qr_code TEXT NOT NULL DEFAULT '';")
	_, _ = pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS screensaver_settings (
			id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
			company_id BIGINT NOT NULL,
			image_url TEXT NOT NULL,
			is_active BOOLEAN NOT NULL DEFAULT TRUE,
			updated_by BIGINT,
			created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`)
	_, _ = pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS cash_sessions (
			id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
			company_id              BIGINT NOT NULL DEFAULT 1,
			warehouse_id            BIGINT NOT NULL,
			status                  VARCHAR(10) NOT NULL DEFAULT 'open',
			opened_by_actor_type    VARCHAR(20) NOT NULL DEFAULT 'admin',
			opened_by_actor_id      BIGINT NOT NULL DEFAULT 1,
			opened_by_name          VARCHAR(200) NOT NULL DEFAULT 'Administrador',
			opened_at               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
			opening_amount          NUMERIC(14,2) NOT NULL DEFAULT 0,
			closed_by_actor_type    VARCHAR(20),
			closed_by_actor_id      BIGINT,
			closed_by_name          VARCHAR(200),
			closed_at               TIMESTAMPTZ,
			cash_total              NUMERIC(14,2),
			transfer_total          NUMERIC(14,2),
			payments_count          INTEGER,
			expected_cash           NUMERIC(14,2),
			counted_cash            NUMERIC(14,2),
			difference              NUMERIC(14,2),
			notes                   TEXT
		);
		CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_sessions_one_open_per_warehouse ON cash_sessions (warehouse_id) WHERE status = 'open';
		CREATE INDEX IF NOT EXISTS idx_cash_sessions_company_opened ON cash_sessions (company_id, opened_at DESC);
		ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS opened_by_name VARCHAR(200) NOT NULL DEFAULT 'Administrador';
		ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS closed_by_name VARCHAR(200);
		ALTER TABLE payments ADD COLUMN IF NOT EXISTS cash_session_id BIGINT;
	`)
	_, _ = pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS cash_session_expenses (
			id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
			cash_session_id BIGINT NOT NULL,
			expense_type VARCHAR(50) NOT NULL DEFAULT 'general',
			receipt_number VARCHAR(100),
			concept TEXT NOT NULL,
			cash_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
			transfer_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`)
	_, _ = pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS sale_stage_history (
			id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
			sale_id      BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
			stage        VARCHAR(20) NOT NULL,
			employee_id  BIGINT REFERENCES employees(id) ON DELETE SET NULL,
			entered_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
			left_at      TIMESTAMPTZ
		);
		CREATE INDEX IF NOT EXISTS idx_sale_stage_history_sale ON sale_stage_history (sale_id, entered_at);
	`)

	return gormDb, nil
}

// Close libera de forma ordenada los recursos de pool tanto de GORM como de pgxpool.
func (d *Database) Close() {
	if d.SQL != nil {
		_ = d.SQL.Close()
	}
	if d.Pool != nil {
		d.Pool.Close()
	}
}

// ConnectGORM inicializa la conexión ORM con convenciones de nombres en snake_case
func ConnectGORM(cfg *config.Config) (*Database, error) {
	gormLogLevel := logger.Warn
	if cfg.AppEnv == "development" {
		gormLogLevel = logger.Info
	}

	gormConfig := &gorm.Config{
		NamingStrategy: schema.NamingStrategy{
			SingularTable: false,
		},
		Logger: logger.Default.LogMode(gormLogLevel),
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
		PrepareStmt: true,
	}

	gormDB, err := gorm.Open(postgres.Open(cfg.DatabaseURL()), gormConfig)
	if err != nil {
		return nil, fmt.Errorf("error al inicializar GORM sobre PostgreSQL: %w", err)
	}

	sqlDB, err := gormDB.DB()
	if err != nil {
		return nil, fmt.Errorf("error al obtener sql.DB subyacente de GORM: %w", err)
	}

	sqlDB.SetMaxOpenConns(int(cfg.DBMaxConns))
	sqlDB.SetMaxIdleConns(int(cfg.DBMinConns))
	sqlDB.SetConnMaxLifetime(45 * time.Minute)
	sqlDB.SetConnMaxIdleTime(15 * time.Minute)

	pingCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := sqlDB.PingContext(pingCtx); err != nil {
		_ = sqlDB.Close()
		return nil, fmt.Errorf("fallo ping sql.DB de GORM hacia PostgreSQL: %w", err)
	}

	return &Database{
		ORM: gormDB,
		SQL: sqlDB,
	}, nil
}

// PingLatency mide la latencia ejecutando un ping sobre la base de datos.
func (d *Database) PingLatency(ctx context.Context) (time.Duration, error) {
	start := time.Now()
	if err := d.SQL.PingContext(ctx); err != nil {
		return time.Since(start), err
	}
	return time.Since(start), nil
}
