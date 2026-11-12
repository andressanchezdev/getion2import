-- 20261129_realtime.sql
-- Base de datos del tiempo real (importadoraRealtime/PLAN-WEBSOCKET.md, etapa E1).
-- Por qué:
--   1. Cada evento del websocket lleva la versión de la fila (updated_at) para descartar eventos viejos o repetidos, y la
--      concurrencia optimista (decisión 4) la compara en TODAS las ediciones. 15 tablas no tenían updated_at.
--   2. fn_set_updated_at() usaba CURRENT_TIMESTAMP (inicio de la transacción): dos cambios en la misma transacción
--      quedaban con la misma versión. Ahora usa clock_timestamp(); las 19 tablas que ya tenían trigger se corrigen solas.
--   3. realtime_events (outbox: el evento se guarda en la misma transacción del cambio) y realtime_tickets (tickets de un solo uso).
--   4. Usuario importadora_realtime con el mínimo privilegio para el servicio aparte. Su contraseña se define al desplegar:
--      ALTER ROLE importadora_realtime PASSWORD '…';  (nunca en este archivo)
-- Requiere PostgreSQL 13+ (pg_current_xact_id, gen_random_uuid).
-- Idempotente. Nunca ejecutar startdb.pgsql sobre una base existente: esta migración es la que se aplica.

BEGIN;

-- 1. versión con reloj real: dos cambios en la misma transacción tienen versiones distintas
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := clock_timestamp();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. updated_at donde falta (15 tablas) y su trigger (16: también product_prices). Al agregarla se llena con created_at (si la tabla lo tiene) antes de crear el trigger,
--    para que la versión inicial sea la fecha real del registro y no la de la migración
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'brands', 'models', 'categories', 'roles', 'product_suppliers', 'product_codes', 'counts', 'doc_series',
        'employee_permissions', 'customer_documents', 'invoices', 'returns', 'payments', 'bank_statement_records', 'cash_sessions',
        'product_prices'  -- ya tenía updated_at pero ningún trigger lo mantenía (lo usa product.prices_changed)
    ] LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'updated_at') THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP', t);
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'created_at') THEN
                EXECUTE format('UPDATE %I SET updated_at = created_at', t);
            END IF;
        END IF;
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', 'trg_' || t || '_updated_at', t);
        EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()', 'trg_' || t || '_updated_at', t);
    END LOOP;
END $$;

-- 3. realtime_events · eventos confirmados que reparte el websocket; se escriben en la misma transacción del cambio
CREATE TABLE IF NOT EXISTS realtime_events (
    seq             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    tx_id           xid8 NOT NULL DEFAULT pg_current_xact_id(),          -- transacción que lo creó: el listener solo lee lo ya visible para todos (14.7)
    company_id      BIGINT REFERENCES companies(id) ON DELETE CASCADE,   -- NULL: evento de plataforma (superadmin)
    warehouse_ids   BIGINT[] NOT NULL DEFAULT '{}',                      -- bodegas afectadas (canal warehouse:{id})
    actor_channel   VARCHAR(60),                                         -- 'employee:12' para eventos personales
    type            VARCHAR(60) NOT NULL,
    permissions     TEXT[] NOT NULL DEFAULT '{}',                        -- basta con uno: {'catalog:view','stock:view'} (filtro del hub)
    actor_type      VARCHAR(20) NOT NULL CHECK (actor_type IN ('employee', 'admin', 'superadmin', 'system')),
    actor_id        BIGINT,
    actor_name      VARCHAR(150) NOT NULL DEFAULT '',                    -- «Ana Pérez», para mostrar quién hizo el cambio
    platform        BOOLEAN NOT NULL DEFAULT FALSE,                      -- también al canal platform (superadmins)
    correlation_id  VARCHAR(64),
    payload         JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_realtime_events_company_seq ON realtime_events (company_id, seq);
CREATE INDEX IF NOT EXISTS idx_realtime_events_created ON realtime_events (created_at);

-- 4. realtime_tickets · tickets de un solo uso para abrir el websocket; la API los emite y importadoraRealtime los consume
CREATE TABLE IF NOT EXISTS realtime_tickets (
    ticket_hash     CHAR(64) PRIMARY KEY,                                -- sha256 del ticket; el ticket en claro nunca se guarda
    actor_type      VARCHAR(20) NOT NULL CHECK (actor_type IN ('employee', 'admin', 'superadmin')),
    actor_id        BIGINT NOT NULL,
    company_id      BIGINT REFERENCES companies(id) ON DELETE CASCADE,
    warehouse_id    BIGINT REFERENCES warehouses(id) ON DELETE CASCADE,
    session_id      BIGINT NOT NULL REFERENCES refresh_tokens(id) ON DELETE CASCADE,
    expires_at      TIMESTAMPTZ NOT NULL,
    used_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_realtime_tickets_expires ON realtime_tickets (expires_at);

-- 5. importadora_realtime · usuario del servicio websocket: lee eventos, sesiones y permisos; solo marca tickets y purga
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'importadora_realtime') THEN
        CREATE ROLE importadora_realtime LOGIN;
    END IF;
END $$;
GRANT SELECT, DELETE ON realtime_events TO importadora_realtime;
GRANT SELECT, DELETE ON realtime_tickets TO importadora_realtime;
GRANT UPDATE (used_at) ON realtime_tickets TO importadora_realtime;
GRANT SELECT ON refresh_tokens, employees, admins, superadmins, employee_permissions, permissions, companies, warehouses TO importadora_realtime;

COMMIT;
