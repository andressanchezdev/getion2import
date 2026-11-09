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
	// ojo: la API ya no crea ni altera tablas al arrancar; el esquema lo definen startdb.pgsql (base nueva) y migrations/ (base existente)

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
