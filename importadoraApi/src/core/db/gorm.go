package db

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

// ConnectGORM inicializa la conexión con GORM usando el driver nativo de PostgreSQL (pgx/v5).
func ConnectGORM(cfg *config.Config) (*Database, error) {
	logLevel := logger.Silent
	if cfg.AppEnv == "development" {
		logLevel = logger.Warn
	}

	gormConfig := &gorm.Config{
		NamingStrategy: schema.NamingStrategy{
			SingularTable: false, // Respeta nombres plurales de tablas como 'companies', 'warehouses', etc.
		},
		Logger: logger.Default.LogMode(logLevel),
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	}

	orm, err := gorm.Open(postgres.Open(cfg.DatabaseURL()), gormConfig)
	if err != nil {
		return nil, fmt.Errorf("error al conectar GORM con PostgreSQL: %w", err)
	}

	sqlDB, err := orm.DB()
	if err != nil {
		return nil, fmt.Errorf("error al obtener sql.DB desde GORM: %w", err)
	}

	sqlDB.SetMaxOpenConns(int(cfg.DBMaxConns))
	sqlDB.SetMaxIdleConns(int(cfg.DBMinConns))
	sqlDB.SetConnMaxLifetime(45 * time.Minute)
	sqlDB.SetConnMaxIdleTime(15 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := sqlDB.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("no se pudo hacer ping a PostgreSQL (%s:%d/%s): %w", cfg.DBHost, cfg.DBPort, cfg.DBName, err)
	}

	return &Database{
		ORM: orm,
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

