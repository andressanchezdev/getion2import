-- Incremental migration for existing databases; do not run startdb.pgsql on production data.
-- Resolve duplicate screensaver rows and cross-company NITs before applying.
BEGIN;

ALTER TABLE warehouse_facturation
    ADD COLUMN IF NOT EXISTS resolution_valid_until DATE;

CREATE TABLE IF NOT EXISTS audit_context_change (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_id BIGINT NOT NULL,
    actor_type VARCHAR(20) NOT NULL CHECK (actor_type = 'superadmin'),
    from_company_id BIGINT REFERENCES companies(id) ON DELETE SET NULL,
    to_company_id BIGINT REFERENCES companies(id) ON DELETE SET NULL,
    to_all_companies BOOLEAN NOT NULL DEFAULT FALSE,
    ip VARCHAR(64),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK ((to_all_companies AND to_company_id IS NULL) OR (NOT to_all_companies AND to_company_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_audit_context_change_actor_created
    ON audit_context_change (actor_id, created_at DESC);

ALTER TABLE notifications
    ALTER COLUMN employee_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS admin_id BIGINT REFERENCES admins(id) ON DELETE CASCADE;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'notifications'::regclass
          AND conname = 'notifications_kind_check'
    ) THEN
        ALTER TABLE notifications DROP CONSTRAINT notifications_kind_check;
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'notifications'::regclass
          AND conname = 'notifications_recipient_check'
    ) THEN
        ALTER TABLE notifications DROP CONSTRAINT notifications_recipient_check;
    END IF;
END $$;

ALTER TABLE notifications
    ADD CONSTRAINT notifications_kind_check
        CHECK (kind IN ('info', 'success', 'warning', 'error', 'restore_record')),
    ADD CONSTRAINT notifications_recipient_check
        CHECK (num_nonnulls(employee_id, admin_id) = 1);

CREATE INDEX IF NOT EXISTS idx_notifications_admin_unread
    ON notifications (admin_id, created_at DESC)
    WHERE read_at IS NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT company_id
        FROM screensaver_settings
        GROUP BY company_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Duplicate screensaver_settings rows exist per company; resolve them before applying this migration';
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_screensaver_settings_company_unique
    ON screensaver_settings (company_id);

DO $$
BEGIN
    IF EXISTS (
        SELECT regexp_replace(nit, '[^0-9]', '', 'g')
        FROM warehouse_facturation
        WHERE regexp_replace(nit, '[^0-9]', '', 'g') NOT IN ('', '0')
        GROUP BY regexp_replace(nit, '[^0-9]', '', 'g')
        HAVING COUNT(DISTINCT company_id) > 1
    ) THEN
        RAISE EXCEPTION 'Duplicate NITs exist across companies; resolve them before applying this migration';
    END IF;
END $$;

CREATE OR REPLACE FUNCTION prevent_cross_company_nit_duplicate() RETURNS trigger AS $$
DECLARE
    normalized_nit TEXT;
BEGIN
    normalized_nit := regexp_replace(NEW.nit, '[^0-9]', '', 'g');
    IF normalized_nit = '' OR normalized_nit = '0' THEN
        RETURN NEW;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(normalized_nit, 0));
    IF EXISTS (
        SELECT 1
        FROM warehouse_facturation existing
        WHERE existing.company_id <> NEW.company_id
          AND existing.warehouse_id <> NEW.warehouse_id
          AND regexp_replace(existing.nit, '[^0-9]', '', 'g') = normalized_nit
    ) THEN
        RAISE EXCEPTION 'NIT already belongs to another company'
            USING ERRCODE = '23505', CONSTRAINT = 'warehouse_facturation_company_nit_unique';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_warehouse_facturation_nit_unique ON warehouse_facturation;
CREATE TRIGGER trg_warehouse_facturation_nit_unique
BEFORE INSERT OR UPDATE OF nit, company_id ON warehouse_facturation
FOR EACH ROW EXECUTE FUNCTION prevent_cross_company_nit_duplicate();

-- Alineacion con startdb.pgsql: el carrito no caduca; columnas nuevas de traslados y devoluciones.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'carts' AND column_name = 'expires_at') THEN
        ALTER TABLE carts ALTER COLUMN expires_at DROP NOT NULL;
        ALTER TABLE carts ALTER COLUMN expires_at DROP DEFAULT;
    END IF;
END $$;

ALTER TABLE transfers ADD COLUMN IF NOT EXISTS is_priority BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS evidence_url TEXT;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Alineacion con startdb.pgsql: traslados, caja, pagos, pantalla de descanso y triggers de updated_at.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transfers_status_check') THEN
        ALTER TABLE transfers DROP CONSTRAINT transfers_status_check;
    END IF;
    ALTER TABLE transfers ADD CONSTRAINT transfers_status_check
        CHECK (status IN ('pending', 'in_transit', 'received', 'with_novelty', 'cancelled'));

    -- caja: un turno abierto por empleado en cada bodega (antes era uno por bodega)
    DROP INDEX IF EXISTS idx_cash_sessions_one_open_per_warehouse;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_sessions_one_open_per_actor
        ON cash_sessions (warehouse_id, opened_by_actor_type, opened_by_actor_id) WHERE status = 'open';

    ALTER TABLE cash_sessions ALTER COLUMN company_id DROP DEFAULT;
    ALTER TABLE cash_sessions ALTER COLUMN opened_by_actor_type DROP DEFAULT;
    ALTER TABLE cash_sessions ALTER COLUMN opened_by_actor_id DROP DEFAULT;
    ALTER TABLE cash_sessions ALTER COLUMN opened_by_name DROP DEFAULT;

    ALTER TABLE cash_session_expenses ALTER COLUMN expense_type SET DEFAULT 'other';
    UPDATE cash_session_expenses SET expense_type = 'other'
        WHERE expense_type NOT IN ('merchandise_arrival', 'payroll', 'loans', 'overtime', 'cleaning_supplies', 'services', 'other');

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cash_session_expenses_expense_type_check') THEN
        ALTER TABLE cash_session_expenses ADD CONSTRAINT cash_session_expenses_expense_type_check
            CHECK (expense_type IN ('merchandise_arrival', 'payroll', 'loans', 'overtime', 'cleaning_supplies', 'services', 'other'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cash_session_expenses_cash_amount_check') THEN
        ALTER TABLE cash_session_expenses ADD CONSTRAINT cash_session_expenses_cash_amount_check CHECK (cash_amount >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cash_session_expenses_transfer_amount_check') THEN
        ALTER TABLE cash_session_expenses ADD CONSTRAINT cash_session_expenses_transfer_amount_check CHECK (transfer_amount >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cash_session_expenses_check') THEN
        ALTER TABLE cash_session_expenses ADD CONSTRAINT cash_session_expenses_check CHECK (cash_amount + transfer_amount > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cash_session_expenses_cash_session_id_fkey') THEN
        ALTER TABLE cash_session_expenses ADD CONSTRAINT cash_session_expenses_cash_session_id_fkey
            FOREIGN KEY (cash_session_id) REFERENCES cash_sessions(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cash_sessions_company_id_fkey') THEN
        ALTER TABLE cash_sessions ADD CONSTRAINT cash_sessions_company_id_fkey
            FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cash_sessions_warehouse_id_fkey') THEN
        ALTER TABLE cash_sessions ADD CONSTRAINT cash_sessions_warehouse_id_fkey
            FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cash_sessions_status_check') THEN
        ALTER TABLE cash_sessions ADD CONSTRAINT cash_sessions_status_check CHECK (status IN ('open', 'closed'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cash_sessions_opening_amount_check') THEN
        ALTER TABLE cash_sessions ADD CONSTRAINT cash_sessions_opening_amount_check CHECK (opening_amount >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cash_sessions_counted_cash_check') THEN
        ALTER TABLE cash_sessions ADD CONSTRAINT cash_sessions_counted_cash_check CHECK (counted_cash IS NULL OR counted_cash >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cash_sessions_check') THEN
        ALTER TABLE cash_sessions ADD CONSTRAINT cash_sessions_check CHECK (status = 'open' OR closed_at IS NOT NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_cash_session_id_fkey') THEN
        ALTER TABLE payments ADD CONSTRAINT payments_cash_session_id_fkey
            FOREIGN KEY (cash_session_id) REFERENCES cash_sessions(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'screensaver_settings_company_id_fkey') THEN
        ALTER TABLE screensaver_settings ADD CONSTRAINT screensaver_settings_company_id_fkey
            FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'screensaver_settings_updated_by_fkey') THEN
        ALTER TABLE screensaver_settings ADD CONSTRAINT screensaver_settings_updated_by_fkey
            FOREIGN KEY (updated_by) REFERENCES employees(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cash_session_expenses_session ON cash_session_expenses (cash_session_id);
CREATE INDEX IF NOT EXISTS idx_cash_session_expenses_type ON cash_session_expenses (expense_type);
CREATE INDEX IF NOT EXISTS idx_payments_cash_session ON payments (cash_session_id);
CREATE INDEX IF NOT EXISTS idx_screensaver_settings_company ON screensaver_settings (company_id, is_active);

DROP TRIGGER IF EXISTS trg_screensaver_settings_updated_at ON screensaver_settings;
CREATE TRIGGER trg_screensaver_settings_updated_at BEFORE UPDATE ON screensaver_settings
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
DROP TRIGGER IF EXISTS trg_warehouse_locations_updated_at ON warehouse_locations;
CREATE TRIGGER trg_warehouse_locations_updated_at BEFORE UPDATE ON warehouse_locations
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Busquedas instantaneas y tolerantes a errores (pg_trgm): un indice GIN por columna que se consulta con ILIKE o con el operador <%
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON customers USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_last_name_trgm ON customers USING gin (last_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_trade_name_trgm ON customers USING gin (trade_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_document_trgm ON customers USING gin (document gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_email_trgm ON customers USING gin ((email::text) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_phone_trgm ON customers USING gin (phone gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_mobile_trgm ON customers USING gin (mobile gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_easysearch_trgm ON products USING gin (easysearch gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_code_trgm ON products USING gin (code gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_employees_full_name_trgm ON employees USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_employees_email_trgm ON employees USING gin ((email::text) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_employees_document_trgm ON employees USING gin (document gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_externals_name_trgm ON externals USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_externals_document_trgm ON externals USING gin (document gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_externals_contact_trgm ON externals USING gin (contact_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_externals_email_trgm ON externals USING gin ((email::text) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_externals_phone_trgm ON externals USING gin (phone gin_trgm_ops);

-- Umbral de parecido para el operador <% (0.4 tolera errores de ortografia; solo se usa como respaldo cuando la busqueda exacta no encuentra nada)
DO $$
BEGIN
    EXECUTE format('ALTER DATABASE %I SET pg_trgm.word_similarity_threshold = 0.4', current_database());
END $$;

-- Columnas y tablas que antes creaba la API sola al arrancar (src/core/db/gorm.go); ahora el esquema solo lo definen startdb.pgsql y esta migracion
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_new BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS manager_employee_id BIGINT;
ALTER TABLE warehouse_locations ADD COLUMN IF NOT EXISTS qr_code TEXT NOT NULL DEFAULT '';
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS opened_by_name VARCHAR(200);
UPDATE cash_sessions SET opened_by_name = 'Administrador' WHERE opened_by_name IS NULL;
ALTER TABLE cash_sessions ALTER COLUMN opened_by_name SET NOT NULL;
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS closed_by_name VARCHAR(200);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS cash_session_id BIGINT;
CREATE TABLE IF NOT EXISTS sale_stage_history (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sale_id      BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    stage        VARCHAR(20) NOT NULL,
    employee_id  BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    entered_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    left_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_sale_stage_history_sale ON sale_stage_history (sale_id, entered_at);
-- el indice antiguo (una sola caja abierta por bodega) lo recreaba el arranque de la API; la regla vigente es una por empleado
DROP INDEX IF EXISTS idx_cash_sessions_one_open_per_warehouse;

-- gastos de caja: mismos largos que startdb.pgsql (solo se acortan si ningun dato existente se pasa del limite)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM cash_session_expenses WHERE char_length(concept) > 200) THEN
        ALTER TABLE cash_session_expenses ALTER COLUMN concept TYPE VARCHAR(200);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM cash_session_expenses WHERE char_length(receipt_number) > 60) THEN
        ALTER TABLE cash_session_expenses ALTER COLUMN receipt_number TYPE VARCHAR(60);
    END IF;
END $$;

-- companies: borrado lógico (el código de compañías ya filtra por deleted_at)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- secuencias: si hay filas con id explícito (semilla o restauración), la secuencia debe ir por delante del id máximo
-- ojo: solo sube, nunca baja, así que es seguro correrla varias veces
DO $sync_seq$
DECLARE r RECORD; mx BIGINT; cur BIGINT;
BEGIN
    FOR r IN (
        SELECT table_name, column_name, pg_get_serial_sequence(quote_ident(table_name), quote_ident(column_name)) AS seq
        FROM information_schema.columns
        WHERE table_schema = 'public' AND (column_default LIKE 'nextval%' OR is_identity = 'YES')
    ) LOOP
        IF r.seq IS NOT NULL THEN
            EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM %I', r.column_name, r.table_name) INTO mx;
            EXECUTE format('SELECT last_value FROM %s', r.seq) INTO cur;
            IF mx > cur THEN
                EXECUTE format('SELECT setval(%L, %s)', r.seq, mx);
            END IF;
        END IF;
    END LOOP;
END
$sync_seq$;

-- un administrador puede pedir traslados sin ser empleado: el solicitante queda vacío (la auditoría guarda quién fue)
ALTER TABLE transfers ALTER COLUMN employee_id DROP NOT NULL;

-- el cierre de caja declara también las transferencias y los abonos (pagos de ventas a crédito) del turno
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS abonos_total NUMERIC(14,2);
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS counted_transfer NUMERIC(14,2) CHECK (counted_transfer IS NULL OR counted_transfer >= 0);
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS counted_abonos NUMERIC(14,2) CHECK (counted_abonos IS NULL OR counted_abonos >= 0);

-- lo mismo con las cotizaciones: un administrador puede crearlas sin ser empleado
ALTER TABLE quotations ALTER COLUMN employee_id DROP NOT NULL;

-- la caja paga las recepciones de compra: el gasto queda ligado a la orden y la orden lleva lo pagado
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS paid_total NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (paid_total >= 0);
ALTER TABLE cash_session_expenses ADD COLUMN IF NOT EXISTS purchase_id BIGINT REFERENCES purchases(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_cash_session_expenses_purchase ON cash_session_expenses (purchase_id);

-- Facturas = lo que pagan las cajas de todas las bodegas: tiene su propio permiso para que solo lo vea quien lo necesita
INSERT INTO permissions (module, action, description)
SELECT 'invoices', a.action, 'Facturas de las cajas · ' || a.label
FROM (VALUES ('view', 'ver'), ('view_detail', 'ver detalle'), ('create', 'crear'), ('edit', 'editar'), ('change_status', 'cambiar estado'), ('delete', 'borrar')) AS a(action, label)
ON CONFLICT (module, action) DO NOTHING;

-- lo mismo con las órdenes de compra: un administrador puede crearlas sin ser empleado
ALTER TABLE purchases ALTER COLUMN employee_id DROP NOT NULL;

-- rechazar una devolución deja el motivo
ALTER TABLE returns ADD COLUMN IF NOT EXISTS reject_reason TEXT;

COMMIT;