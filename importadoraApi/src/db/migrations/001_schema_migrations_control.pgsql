-- 001_schema_migrations_control.pgsql · Crea la tabla de control de migraciones y asegura particiones de auditoría
-- conecta con: src/db/migrations/migrator.js y tabla schema_migrations

BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations(
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    version           TEXT NOT NULL UNIQUE,
    name              TEXT NOT NULL,
    filename          TEXT NOT NULL,
    checksum          TEXT NOT NULL,
    execution_time_ms INTEGER NOT NULL DEFAULT 0,
    applied_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at
    ON schema_migrations(applied_at DESC);

SELECT audit_ensure_partitions(2);

COMMIT;

