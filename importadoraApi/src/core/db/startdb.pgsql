-- ============================================================
-- GESTIÓN IMPORTADORA - BASE DE DATOS V5 CONSOLIDADA (51 TABLAS + VISTAS + TRIGGERS + SEMILLA COMPLETA)
-- ============================================================
-- Script de inicialización completo (43 tablas + vistas + datos semilla)
-- compatible con pgAdmin 4 (Query Tool -> F5) y con src/db/migrations/migrator.js.
--
-- INSTRUCCIONES EN PGADMIN 4:
-- 1. Seleccione la base de datos destino (ej. "Importadora") y abra Query Tool.
-- 2. Copie/abra este archivo completo y ejecútelo con F5.
-- 3. Este script trabaja sobre la base seleccionada:
--    elimina estructuras previas del proyecto, recrea las 43 tablas, índices,
--    funciones ligeras, triggers, vistas y carga los datos semilla iniciales.
--
-- NOTA: Si desea crear únicamente la estructura vacía SIN datos semilla,
-- ejecute en su lugar: src/db/startdb1.pgsql
-- ============================================================

BEGIN;

-- ============================================================
-- EXTENSIONES REQUERIDAS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- PARTE 1: LIMPIAR VISTAS, TABLAS Y OBJETOS PREVIOS
-- ============================================================

-- Vistas actuales y heredadas
DROP VIEW IF EXISTS v_customer_credit_summary CASCADE;
DROP VIEW IF EXISTS v_company_stock CASCADE;
DROP VIEW IF EXISTS v_warehouse_stock CASCADE;
DROP VIEW IF EXISTS v_sale_balance CASCADE;
DROP VIEW IF EXISTS v_customer_credit CASCADE;
DROP VIEW IF EXISTS v_credit_invoices CASCADE;
DROP VIEW IF EXISTS v_stock CASCADE;
DROP VIEW IF EXISTS v_stock_company CASCADE;
DROP VIEW IF EXISTS v_virtual_stock CASCADE;
DROP VIEW IF EXISTS v_locations CASCADE;

-- Tablas del esquema V4 final (43 tablas)
DROP TABLE IF EXISTS schema_migrations CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS purchase_items CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS credit_entries CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS return_items CASCADE;
DROP TABLE IF EXISTS returns CASCADE;
DROP TABLE IF EXISTS quotation_items CASCADE;
DROP TABLE IF EXISTS quotations CASCADE;
DROP TABLE IF EXISTS sale_stage_history CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS carts CASCADE;
DROP TABLE IF EXISTS doc_series CASCADE;
DROP TABLE IF EXISTS count_items CASCADE;
DROP TABLE IF EXISTS counts CASCADE;
DROP TABLE IF EXISTS audit_movements CASCADE;
DROP TABLE IF EXISTS details_transfer CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS stock CASCADE;
DROP TABLE IF EXISTS product_suppliers CASCADE;
DROP TABLE IF EXISTS product_codes CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS models CASCADE;
DROP TABLE IF EXISTS brands CASCADE;
DROP TABLE IF EXISTS externals CASCADE;
DROP TABLE IF EXISTS customer_documents CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS employee_login_attempts CASCADE;
DROP TABLE IF EXISTS employee_permissions CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS warehouse_facturation CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS superadmins CASCADE;

-- Limpieza preventiva de tablas/secuencias/vistas de versiones anteriores (V10 / V4 previo)
DROP MATERIALIZED VIEW IF EXISTS mv_sales_daily CASCADE;
DROP TABLE IF EXISTS realtime_events CASCADE;
DROP TABLE IF EXISTS stock_count_items CASCADE;
DROP TABLE IF EXISTS stock_counts CASCADE;
DROP TABLE IF EXISTS cash_closures CASCADE;
DROP TABLE IF EXISTS audit_events CASCADE;
DROP SEQUENCE IF EXISTS audit_events_id_seq CASCADE;
DROP TABLE IF EXISTS audit_actions CASCADE;
DROP TABLE IF EXISTS siigo_outbox CASCADE;
DROP TABLE IF EXISTS siigo_credentials CASCADE;
DROP TABLE IF EXISTS sale_stages CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS transfer_items CASCADE;
DROP TABLE IF EXISTS stock_shares CASCADE;
DROP TABLE IF EXISTS store_warehouses CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS cash_movements CASCADE;
DROP TABLE IF EXISTS cash_session_expenses CASCADE;
DROP TABLE IF EXISTS cash_sessions CASCADE;
DROP TABLE IF EXISTS cash_registers CASCADE;
DROP TABLE IF EXISTS product_prices CASCADE;
DROP TABLE IF EXISTS warehouse_locations CASCADE;
DROP TABLE IF EXISTS price_levels CASCADE;
DROP TABLE IF EXISTS company_brands CASCADE;
DROP TABLE IF EXISTS customer_discounts CASCADE;
DROP TABLE IF EXISTS third_parties CASCADE;
DROP TABLE IF EXISTS partners CASCADE;
DROP TABLE IF EXISTS user_warehouses CASCADE;
DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS bank_statement_records CASCADE;
DROP TABLE IF EXISTS recycle_bin CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Eliminar cualquier función propia previa en public (preservando funciones de extensiones pgcrypto/citext/pg_trgm)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure AS fn_sig
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND NOT EXISTS (
              SELECT 1 FROM pg_depend d
              WHERE d.objid = p.oid AND d.deptype = 'e'
          )
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.fn_sig || ' CASCADE';
    END LOOP;
END $$;


-- ============================================================
-- PARTE 2: CREAR TABLAS E ÍNDICES (43 TABLAS)
-- ============================================================

-- ------------------------------------------------------------
-- GRUPO 1: SUPERADMINS, COMPAÑÍAS, BODEGAS+FACTURACIÓN Y ACCESOS (11)
-- ------------------------------------------------------------

-- 1. TABLA: superadmins (Superusuarios desarrolladores globales)
CREATE TABLE superadmins (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username        VARCHAR(60) NOT NULL UNIQUE
        CHECK (char_length(btrim(username)) >= 3),
    email           CITEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL DEFAULT '',
    full_name       TEXT GENERATED ALWAYS AS (btrim(first_name || ' ' || last_name)) STORED,
    phone           VARCHAR(30),
    access_level    VARCHAR(30) NOT NULL DEFAULT 'developer'
        CHECK (access_level IN ('developer', 'root', 'support')),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLA: companies (Todas en el mismo nivel, sin is_host y sin facturación directa)
CREATE TABLE companies (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_by_superadmin_id    BIGINT REFERENCES superadmins(id) ON DELETE SET NULL,
    name                        VARCHAR(150) NOT NULL UNIQUE
        CHECK (char_length(btrim(name)) >= 2),
    email                       CITEXT,
    phone                       VARCHAR(30),
    address                     TEXT,
    city                        VARCHAR(100),
    logo_url                    TEXT,
    is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at                  TIMESTAMPTZ
);

-- 3. TABLA: warehouses (Bodegas únicas por compañía, todas al mismo nivel, sin is_main)
CREATE TABLE warehouses (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code            VARCHAR(30) NOT NULL,
    name            VARCHAR(150) NOT NULL,
    city            VARCHAR(100),
    address         TEXT,
    phone           VARCHAR(30),
    description     TEXT,
    manager_employee_id BIGINT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, code)
);

CREATE INDEX idx_warehouses_company_active ON warehouses (company_id, is_active);

-- 4. TABLA: warehouse_facturation (Facturación directa por cada bodega: natural | juridica)
CREATE TABLE warehouse_facturation (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id          BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    warehouse_id        BIGINT NOT NULL UNIQUE REFERENCES warehouses(id) ON DELETE CASCADE,
    type_facturation    VARCHAR(20) NOT NULL DEFAULT 'juridica'
        CHECK (type_facturation IN ('natural', 'juridica')),
    document_type       VARCHAR(20) NOT NULL DEFAULT 'NIT'
        CHECK (document_type IN ('NIT', 'CC', 'CE')),
    nit                 VARCHAR(30) NOT NULL,
    legal_name          VARCHAR(200) NOT NULL,
    trade_name          VARCHAR(150),
    billing_email       CITEXT,
    billing_phone       VARCHAR(30),
    billing_address     TEXT,
    billing_city        VARCHAR(100),
    logo_url            TEXT,
    vat_withholder      BOOLEAN NOT NULL DEFAULT FALSE,
    income_withholder   BOOLEAN NOT NULL DEFAULT FALSE,
    self_withholder     BOOLEAN NOT NULL DEFAULT FALSE,
    invoice_prefix      VARCHAR(20),
    resolution_number   VARCHAR(60),
    resolution_date     DATE,
    resolution_valid_until DATE,
    range_from          BIGINT,
    range_to            BIGINT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (range_from IS NULL OR range_to IS NULL OR range_to >= range_from)
);

CREATE INDEX idx_warehouse_facturation_company ON warehouse_facturation (company_id);

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

CREATE TRIGGER trg_warehouse_facturation_nit_unique
BEFORE INSERT OR UPDATE OF nit, company_id ON warehouse_facturation
FOR EACH ROW EXECUTE FUNCTION prevent_cross_company_nit_duplicate();

-- 5. TABLA: warehouse_locations (Ubicaciones físicas administrables por bodega)
CREATE TABLE warehouse_locations (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    warehouse_id    BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    code            VARCHAR(60) NOT NULL,
    description     TEXT,
    qr_code         TEXT NOT NULL DEFAULT '',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (warehouse_id, code)
);

CREATE INDEX idx_warehouse_locations_lookup ON warehouse_locations (warehouse_id, is_active);

-- 6. TABLA: roles (Descriptivos por compañía, sin area y sin permisos asociados)
CREATE TABLE roles (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code            VARCHAR(50) NOT NULL,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, code)
);

-- 6. TABLA: permissions (Catálogo maestro de permisos habilitables)
CREATE TABLE permissions (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    module          VARCHAR(60) NOT NULL,
    action          VARCHAR(60) NOT NULL,
    description     TEXT,
    UNIQUE (module, action)
);

-- 7. TABLA: employees (Tabla central operativa: id = employee_id en toda la BD)
CREATE TABLE employees (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id          BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    role_id             BIGINT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    warehouse_id        BIGINT REFERENCES warehouses(id) ON DELETE SET NULL,
    email               CITEXT NOT NULL UNIQUE,
    password_hash       TEXT NOT NULL,
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL DEFAULT '',
    full_name           TEXT GENERATED ALWAYS AS (btrim(first_name || ' ' || last_name)) STORED,
    document_type       VARCHAR(20) NOT NULL DEFAULT 'CC'
        CHECK (document_type IN ('CC', 'CE', 'NIT', 'PA')),
    document            VARCHAR(30),
    phone               VARCHAR(30),
    address             TEXT,
    photo_url           TEXT,
    work_modality       VARCHAR(20) NOT NULL DEFAULT 'onsite'
        CHECK (work_modality IN ('onsite', 'remote', 'hybrid')),
    employment_status   VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (employment_status IN ('active', 'leave', 'retired')),
    status              VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'blocked')),
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_uq_employees_company_doc
    ON employees (company_id, document)
    WHERE document IS NOT NULL;
CREATE INDEX idx_employees_company_role ON employees (company_id, role_id, status);
CREATE INDEX idx_employees_warehouse ON employees (warehouse_id);

-- 8. TABLA: admins (Administradores de cada compañía)
CREATE TABLE admins (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id                  BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id                 BIGINT UNIQUE REFERENCES employees(id) ON DELETE SET NULL,
    created_by_superadmin_id    BIGINT REFERENCES superadmins(id) ON DELETE SET NULL,
    email                       CITEXT NOT NULL UNIQUE,
    password_hash               TEXT NOT NULL,
    first_name                  VARCHAR(100) NOT NULL,
    last_name                   VARCHAR(100) NOT NULL DEFAULT '',
    full_name                   TEXT GENERATED ALWAYS AS (btrim(first_name || ' ' || last_name)) STORED,
    document_type               VARCHAR(20) NOT NULL DEFAULT 'CC'
        CHECK (document_type IN ('CC', 'CE', 'NIT', 'PA')),
    document                    VARCHAR(30),
    phone                       VARCHAR(30),
    is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at               TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admins_company ON admins (company_id, is_active);

-- 9. TABLA: employee_permissions (Permisos habilitados directamente al empleado)
CREATE TABLE employee_permissions (
    employee_id             BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    permission_id           BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_by_admin_id     BIGINT REFERENCES admins(id) ON DELETE SET NULL,
    granted_by_employee_id  BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    granted_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (employee_id, permission_id)
);

CREATE INDEX idx_employee_permissions_perm ON employee_permissions (permission_id);

-- 10. TABLA: employee_login_attempts (Control independiente de failed_login_count)
CREATE TABLE employee_login_attempts (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id         BIGINT UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
    email               CITEXT NOT NULL UNIQUE,
    failed_login_count  INTEGER NOT NULL DEFAULT 0 CHECK (failed_login_count >= 0),
    blocked_until       TIMESTAMPTZ,
    last_attempt_at     TIMESTAMPTZ,
    last_ip             VARCHAR(64),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. TABLA: refresh_tokens (Sesiones activas de empleados, admins y superadmins)
CREATE TABLE refresh_tokens (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id     BIGINT REFERENCES employees(id) ON DELETE CASCADE,
    admin_id        BIGINT REFERENCES admins(id) ON DELETE CASCADE,
    superadmin_id   BIGINT REFERENCES superadmins(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL UNIQUE,
    device          TEXT,
    ip_address      VARCHAR(64),
    expires_at      TIMESTAMPTZ NOT NULL,
    last_used_at    TIMESTAMPTZ,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (num_nonnulls(employee_id, admin_id, superadmin_id) = 1)
);

CREATE INDEX idx_refresh_tokens_employee ON refresh_tokens (employee_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_refresh_tokens_admin ON refresh_tokens (admin_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_refresh_tokens_superadmin ON refresh_tokens (superadmin_id) WHERE revoked_at IS NULL;


-- ------------------------------------------------------------
-- GRUPO 2: CLIENTES, DOCUMENTOS Y EXTERNOS (3)
-- ------------------------------------------------------------

-- 12. TABLA: customers (Sin commission_rate, sin invoice_email, sin city_code, con discount_percent)
CREATE TABLE customers (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id              BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    document_type           VARCHAR(20) NOT NULL DEFAULT 'CC'
        CHECK (document_type IN ('CC', 'CE', 'NIT', 'PA')),
    document                VARCHAR(30) NOT NULL,
    person_type             VARCHAR(20) NOT NULL DEFAULT 'natural'
        CHECK (person_type IN ('natural', 'legal')),
    name                    VARCHAR(150) NOT NULL,
    last_name               VARCHAR(150),
    trade_name              VARCHAR(150),
    legal_representative    VARCHAR(150),
    email                   CITEXT,
    phone                   VARCHAR(30),
    mobile                  VARCHAR(30),
    address                 TEXT,
    city                    VARCHAR(100),
    vat_responsible         BOOLEAN NOT NULL DEFAULT FALSE,
    fiscal_resp_codes       TEXT[] NOT NULL DEFAULT '{R-99-PN}',
    addresses               JSONB NOT NULL DEFAULT '[]'::jsonb,
    contacts                JSONB NOT NULL DEFAULT '[]'::jsonb,
    price_tier              VARCHAR(10) NOT NULL DEFAULT 'p1'
        CHECK (price_tier IN ('p1', 'p2', 'p3', 'p4')),
    discount_percent        NUMERIC(5,2) NOT NULL DEFAULT 0
        CHECK (discount_percent >= 0 AND discount_percent <= 100),
    credit_enabled          BOOLEAN NOT NULL DEFAULT FALSE,
    credit_limit            NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
    credit_days             SMALLINT NOT NULL DEFAULT 30 CHECK (credit_days >= 0 AND credit_days <= 365),
    credit_warning_pct      NUMERIC(5,2) NOT NULL DEFAULT 70.00 CHECK (credit_warning_pct >= 0 AND credit_warning_pct <= 100),
    docs_validity_months    INTEGER NOT NULL DEFAULT 12 CHECK (docs_validity_months > 0),
    status                  VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('pending', 'active', 'overdue', 'inactive')),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at              TIMESTAMPTZ,
    UNIQUE (company_id, document)
);

CREATE INDEX idx_customers_company_status ON customers (company_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_name_trgm ON customers USING gin (name gin_trgm_ops);

-- 13. TABLA: customer_documents (Sin employee_id; la trazabilidad va en audit_logs)
CREATE TABLE customer_documents (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id     BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    doc_type        VARCHAR(40) NOT NULL
        CHECK (doc_type IN ('rut', 'id_card', 'chamber', 'credit_form', 'other')),
    file_name       VARCHAR(255) NOT NULL,
    file_url        TEXT NOT NULL,
    mime_type       VARCHAR(100),
    notes           TEXT,
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customer_documents_customer ON customer_documents (customer_id);

-- 14. TABLA: externals (Proveedores, transportadoras y otros externos)
CREATE TABLE externals (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    kind            VARCHAR(20) NOT NULL
        CHECK (kind IN ('supplier', 'carrier', 'other')),
    category        VARCHAR(80),
    document_type   VARCHAR(20) NOT NULL DEFAULT 'NIT'
        CHECK (document_type IN ('CC', 'CE', 'NIT', 'PA')),
    document        VARCHAR(30),
    name            VARCHAR(150) NOT NULL,
    contact_name    VARCHAR(150),
    contact_phone   VARCHAR(30),
    contact_email   CITEXT,
    phone           VARCHAR(30),
    email           CITEXT,
    address         TEXT,
    city            VARCHAR(100),
    terms_days      SMALLINT NOT NULL DEFAULT 0 CHECK (terms_days >= 0),
    credit_limit    NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
    coverage        TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, kind, name)
);

CREATE UNIQUE INDEX idx_uq_externals_company_kind_doc
    ON externals (company_id, kind, document)
    WHERE document IS NOT NULL;
CREATE INDEX idx_externals_company_kind ON externals (company_id, kind, is_active);


-- ------------------------------------------------------------
-- GRUPO 3: CATÁLOGO Y PRECIOS EN PRODUCTO (6)
-- ------------------------------------------------------------

-- 15. TABLA: brands
CREATE TABLE brands (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    name            VARCHAR(120) NOT NULL,
    image_url       TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, name)
);

-- 16. TABLA: models (Con campo description opcional)
CREATE TABLE models (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    name            VARCHAR(120) NOT NULL,
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, name)
);

-- 17. TABLA: categories (Con parent_id para jerarquía padre -> subcategoría)
CREATE TABLE categories (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    parent_id       BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    name            VARCHAR(120) NOT NULL,
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (parent_id IS NULL OR parent_id <> id)
);

CREATE UNIQUE INDEX idx_uq_categories_company_parent_name
    ON categories (company_id, COALESCE(parent_id, 0), lower(name));

-- 18. TABLA: products (category_id obligatorio, iva NULL/0=exento, prices JSONB p1..p4)
CREATE TABLE products (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid            UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    category_id     BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    brand_id        BIGINT REFERENCES brands(id) ON DELETE SET NULL,
    model_id        BIGINT REFERENCES models(id) ON DELETE SET NULL,
    code            VARCHAR(80) NOT NULL,
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    unit            VARCHAR(20) NOT NULL DEFAULT 'UND',
    iva             NUMERIC(5,2)
        CHECK (iva IS NULL OR (iva >= 0 AND iva <= 100)),
    last_cost       NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (last_cost >= 0),
    is_promotion    BOOLEAN NOT NULL DEFAULT FALSE,
    is_new          BOOLEAN NOT NULL DEFAULT FALSE,
    images          TEXT[] NOT NULL DEFAULT '{}',
    easysearch      TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('draft', 'active', 'inactive', 'discontinued')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMPTZ,
    UNIQUE (company_id, code)
);

CREATE INDEX idx_products_company_category ON products (company_id, category_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX idx_products_easysearch_trgm ON products USING gin (easysearch gin_trgm_ops);

-- 19. TABLA: product_prices (Precios dinámicos por producto: p1..p4 y listas adicionales)
CREATE TABLE product_prices (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    product_id      BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price_tier      VARCHAR(30) NOT NULL,
    price           NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (product_id, price_tier)
);

CREATE INDEX idx_product_prices_product ON product_prices (product_id);
CREATE INDEX idx_product_prices_company_tier ON product_prices (company_id, price_tier);

-- 19. TABLA: product_codes
CREATE TABLE product_codes (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    product_id      BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    code_type       VARCHAR(20) NOT NULL
        CHECK (code_type IN ('sku', 'reference', 'barcode', 'supplier', 'oem')),
    code            VARCHAR(80) NOT NULL,
    UNIQUE (company_id, code_type, code)
);

CREATE INDEX idx_product_codes_product ON product_codes (product_id);

-- 20. TABLA: product_suppliers
CREATE TABLE product_suppliers (
    product_id      BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    supplier_id     BIGINT NOT NULL REFERENCES externals(id) ON DELETE CASCADE,
    cost            NUMERIC(14,2) NOT NULL CHECK (cost >= 0),
    supplier_code   VARCHAR(80),
    PRIMARY KEY (product_id, supplier_id)
);


-- ------------------------------------------------------------
-- GRUPO 4: INVENTARIO Y TRASLADOS MULTI-ÍTEM BODEGA <-> BODEGA (6)
-- ------------------------------------------------------------

-- 21. TABLA: stock
CREATE TABLE stock (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    product_id      BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    warehouse_id    BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    location        VARCHAR(60) NOT NULL DEFAULT '',
    available       INTEGER NOT NULL DEFAULT 0 CHECK (available >= 0),
    reserved        INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0 AND reserved <= available),
    min_stock       INTEGER NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
    max_stock       INTEGER CHECK (max_stock IS NULL OR max_stock >= min_stock),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (product_id, warehouse_id, location)
);

CREATE INDEX idx_stock_company_warehouse ON stock (company_id, warehouse_id);
CREATE INDEX idx_stock_product ON stock (product_id);

-- 22. TABLA: transfers (Encabezado del traslado Bodega origen <-> Bodega destino)
CREATE TABLE transfers (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id                  BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    serial_code                 VARCHAR(40) NOT NULL,
    transfer_type               VARCHAR(40) NOT NULL DEFAULT 'standard',
    origin_warehouse_id         BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    destination_warehouse_id    BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    employee_id                 BIGINT REFERENCES employees(id) ON DELETE RESTRICT,
    dispatched_by_employee_id   BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    received_by_employee_id     BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    status                      VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_transit', 'received', 'with_novelty', 'cancelled')),
    priority                    VARCHAR(20) NOT NULL DEFAULT 'normal',
    notes                       TEXT,
    is_priority                 BOOLEAN NOT NULL DEFAULT FALSE,
    novelty_notes               TEXT,
    cancel_reason               TEXT,
    dispatched_at               TIMESTAMPTZ,
    received_at                 TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, serial_code),
    CHECK (destination_warehouse_id <> origin_warehouse_id)
);

CREATE INDEX idx_transfers_company_status ON transfers (company_id, status);
CREATE INDEX idx_transfers_warehouses ON transfers (origin_warehouse_id, destination_warehouse_id);

-- 23. TABLA: details_transfer (Lista 1:N de 1 o múltiples productos trasladados simultáneamente)
CREATE TABLE details_transfer (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transfer_id             BIGINT NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
    product_id              BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    origin_stock_id         BIGINT NOT NULL REFERENCES stock(id) ON DELETE RESTRICT,
    destination_stock_id    BIGINT REFERENCES stock(id) ON DELETE SET NULL,
    product_code            VARCHAR(80) NOT NULL,
    product_name            VARCHAR(200) NOT NULL,
    destination_location    VARCHAR(60) NOT NULL DEFAULT '',
    quantity                INTEGER NOT NULL CHECK (quantity > 0),
    received_qty            INTEGER NOT NULL DEFAULT 0
        CHECK (received_qty >= 0 AND received_qty <= quantity),
    notes                   TEXT,
    UNIQUE (transfer_id, product_id, origin_stock_id)
);

CREATE INDEX idx_details_transfer_transfer ON details_transfer (transfer_id);

-- 24. TABLA: audit_movements (Kardex / auditoría de movimientos de stock)
CREATE TABLE audit_movements (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    stock_id        BIGINT NOT NULL REFERENCES stock(id) ON DELETE RESTRICT,
    employee_id     BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    movement_type   VARCHAR(30) NOT NULL
        CHECK (movement_type IN ('purchase_in', 'sale_out', 'transfer_out', 'transfer_in', 'adjustment', 'return_in', 'count_adjust')),
    quantity        INTEGER NOT NULL CHECK (quantity <> 0),
    previous_qty    INTEGER,
    new_qty         INTEGER,
    reference_type  VARCHAR(30),
    reference_id    BIGINT,
    reason          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_movements_stock ON audit_movements (stock_id, created_at DESC);
CREATE INDEX idx_audit_movements_company ON audit_movements (company_id, created_at DESC);

-- 25. TABLA: counts
CREATE TABLE counts (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    warehouse_id    BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    employee_id     BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'verified', 'corroborated')),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at       TIMESTAMPTZ
);

CREATE INDEX idx_counts_company_warehouse ON counts (company_id, warehouse_id, status);

-- 26. TABLA: count_items
CREATE TABLE count_items (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    count_id        BIGINT NOT NULL REFERENCES counts(id) ON DELETE CASCADE,
    stock_id        BIGINT NOT NULL REFERENCES stock(id) ON DELETE RESTRICT,
    employee_id     BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    expected_qty    INTEGER NOT NULL CHECK (expected_qty >= 0),
    counted_qty     INTEGER CHECK (counted_qty IS NULL OR counted_qty >= 0),
    UNIQUE (count_id, stock_id)
);


-- ------------------------------------------------------------
-- GRUPO 5: VENTAS, ÍTEMS+PROCESOS Y DEVOLUCIONES (9)
-- ------------------------------------------------------------

-- 27. TABLA: doc_series
CREATE TABLE doc_series (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    warehouse_id    BIGINT REFERENCES warehouses(id) ON DELETE CASCADE,
    doc_type        VARCHAR(20) NOT NULL
        CHECK (doc_type IN ('sale', 'transfer', 'quotation', 'purchase', 'payment', 'invoice')),
    prefix          VARCHAR(20) NOT NULL,
    next_number     BIGINT NOT NULL DEFAULT 1 CHECK (next_number >= 1)
);

CREATE UNIQUE INDEX idx_uq_doc_series_scope
    ON doc_series (company_id, COALESCE(warehouse_id, 0), doc_type);

-- 28. TABLA: carts
CREATE TABLE carts (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid            UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id     BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    customer_id     BIGINT REFERENCES customers(id) ON DELETE SET NULL,
    warehouse_id    BIGINT REFERENCES warehouses(id) ON DELETE SET NULL,
    price_tier      VARCHAR(10) NOT NULL DEFAULT 'p1'
        CHECK (price_tier IN ('p1', 'p2', 'p3', 'p4')),
    status          VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'converted', 'abandoned')),
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_carts_company_employee ON carts (company_id, employee_id, status);

-- 29. TABLA: cart_items
CREATE TABLE cart_items (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cart_id         BIGINT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id      BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    stock_id        BIGINT NOT NULL REFERENCES stock(id) ON DELETE RESTRICT,
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    unit_price      NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
    discount        NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    UNIQUE (cart_id, stock_id)
);

-- 30. TABLA: sales (Con employee_id del empleado que realiza la venta y warehouse_id)
CREATE TABLE sales (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id                  BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    serial_code                 VARCHAR(40) NOT NULL,
    customer_id                 BIGINT REFERENCES customers(id) ON DELETE RESTRICT,
    employee_id                 BIGINT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    warehouse_id                BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    cart_id                     BIGINT UNIQUE REFERENCES carts(id) ON DELETE SET NULL,
    price_tier                  VARCHAR(10) NOT NULL DEFAULT 'p1'
        CHECK (price_tier IN ('p1', 'p2', 'p3', 'p4')),
    payment_method              VARCHAR(20) NOT NULL
        CHECK (payment_method IN ('cash', 'transfer', 'credit')),
    payment_condition           VARCHAR(20)
        CHECK (payment_condition IS NULL OR payment_condition IN ('cash', 'credit')),
    immediate_picking           BOOLEAN NOT NULL DEFAULT FALSE,
    status                      VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'completed', 'cancelled')),
    current_stage               VARCHAR(20) NOT NULL DEFAULT 'verification'
        CHECK (current_stage IN (
            'verification',
            'verification_ok',
            'picking',
            'picking_ok',
            'packing',
            'packing_ok',
            'invoicing',
            'invoicing_ok',
            'dispatch',
            'sent',
            'cancelled'
        )),
    subtotal                    NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    discount_total              NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
    iva_total                   NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (iva_total >= 0),
    total                       NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    paid_total                  NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (paid_total >= 0),
    credit_amount               NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
    sale_at                     TIMESTAMPTZ,
    due_date                    DATE,
    shipping_address            JSONB,
    carrier_id                  BIGINT REFERENCES externals(id) ON DELETE SET NULL,
    tracking_no                 VARCHAR(80),
    cancel_reason               TEXT,
    cancelled_by_employee_id    BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    payment_proof_url           TEXT,
    payment_reference           VARCHAR(100),
    notes                       TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, serial_code)
);

CREATE INDEX idx_sales_company_status_stage ON sales (company_id, status, current_stage);
CREATE INDEX idx_sales_warehouse_created ON sales (warehouse_id, created_at DESC);
CREATE INDEX idx_sales_customer ON sales (customer_id);
CREATE INDEX idx_sales_employee ON sales (employee_id);

-- 31. TABLA: sale_items (Fusión: productos vendidos + todos los employee_id del ciclo pedido -> venta)
CREATE TABLE sale_items (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sale_id                     BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id                  BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    stock_id                    BIGINT NOT NULL REFERENCES stock(id) ON DELETE RESTRICT,
    product_code                VARCHAR(80) NOT NULL,
    product_name                VARCHAR(200) NOT NULL,
    price_tier                  VARCHAR(10) NOT NULL DEFAULT 'p1'
        CHECK (price_tier IN ('p1', 'p2', 'p3', 'p4')),
    quantity                    INTEGER NOT NULL CHECK (quantity > 0),
    picked_qty                  INTEGER NOT NULL DEFAULT 0
        CHECK (picked_qty >= 0 AND picked_qty <= quantity),
    packed_qty                  INTEGER NOT NULL DEFAULT 0
        CHECK (packed_qty >= 0 AND packed_qty <= quantity),
    dispatched_qty              INTEGER NOT NULL DEFAULT 0
        CHECK (dispatched_qty >= 0 AND dispatched_qty <= quantity),
    unit_price                  NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
    unit_cost                   NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
    discount                    NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    iva_percent                 NUMERIC(5,2)
        CHECK (iva_percent IS NULL OR (iva_percent >= 0 AND iva_percent <= 100)),
    iva_amount                  NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (iva_amount >= 0),
    subtotal                    NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    line_total                  NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (line_total >= 0),
    process_stage               VARCHAR(20) NOT NULL DEFAULT 'verification'
        CHECK (process_stage IN (
            'verification',
            'verification_ok',
            'picking',
            'picking_ok',
            'packing',
            'packing_ok',
            'invoicing',
            'invoicing_ok',
            'dispatch',
            'sent'
        )),
    stage_status                VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (stage_status IN ('pending', 'in_progress', 'paused', 'completed')),
    verified_by_employee_id     BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    verified_at                 TIMESTAMPTZ,
    picked_by_employee_id       BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    picked_at                   TIMESTAMPTZ,
    packed_by_employee_id       BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    packed_at                   TIMESTAMPTZ,
    invoiced_by_employee_id     BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    invoiced_at                 TIMESTAMPTZ,
    dispatched_by_employee_id   BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    dispatched_at               TIMESTAMPTZ,
    sent_by_employee_id         BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    sent_at                     TIMESTAMPTZ,
    process_notes               TEXT
);

CREATE INDEX idx_sale_items_sale ON sale_items (sale_id);
CREATE INDEX idx_sale_items_product ON sale_items (product_id);
CREATE INDEX idx_sale_items_stage ON sale_items (process_stage, stage_status);

-- 32. TABLA: quotations
CREATE TABLE quotations (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    serial_code     VARCHAR(40) NOT NULL,
    customer_id     BIGINT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    employee_id     BIGINT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    cart_id         BIGINT REFERENCES carts(id) ON DELETE SET NULL,
    sale_id         BIGINT REFERENCES sales(id) ON DELETE SET NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted')),
    valid_until     DATE,
    subtotal        NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    discount_total  NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
    iva_total       NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (iva_total >= 0),
    total           NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, serial_code)
);

CREATE INDEX idx_quotations_company_status ON quotations (company_id, status);

-- 33. TABLA: quotation_items
CREATE TABLE quotation_items (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    quotation_id    BIGINT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    product_id      BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    unit_price      NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
    discount        NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    iva_percent     NUMERIC(5,2)
        CHECK (iva_percent IS NULL OR (iva_percent >= 0 AND iva_percent <= 100)),
    line_total      NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (line_total >= 0)
);

CREATE INDEX idx_quotation_items_quotation ON quotation_items (quotation_id);

-- 34. TABLA: returns
CREATE TABLE returns (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id                  BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    sale_id                     BIGINT NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
    customer_id                 BIGINT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    employee_id                 BIGINT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    approved_by_employee_id     BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    reason                      TEXT NOT NULL,
    reason_type                 VARCHAR(20) NOT NULL DEFAULT 'warranty'
        CHECK (reason_type IN ('warranty', 'wrong_item')),
    resolution_type             VARCHAR(20) NOT NULL DEFAULT 'credit_balance'
        CHECK (resolution_type IN ('exchange', 'credit_balance')),
    replacement_product_id      BIGINT REFERENCES products(id) ON DELETE SET NULL,
    replacement_stock_id        BIGINT REFERENCES stock(id) ON DELETE SET NULL,
    status                      VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    total                       NUMERIC(14,2) NOT NULL CHECK (total > 0),
    evidence_url                TEXT,
    receipt_url                 TEXT,
    approved_at                 TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_returns_company_sale ON returns (company_id, sale_id);

-- 35. TABLA: return_items
CREATE TABLE return_items (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    return_id       BIGINT NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    sale_item_id    BIGINT NOT NULL REFERENCES sale_items(id) ON DELETE RESTRICT,
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    restock         BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_return_items_return ON return_items (return_id);


-- ------------------------------------------------------------
-- GRUPO 6: CARTERA, PAGOS, COMPRAS Y FACTURAS POR BODEGA (5)
-- ------------------------------------------------------------

-- 36b. TABLA: cash_sessions (turnos de caja: se abre con un fondo, recibe pagos y se cierra contando el efectivo)
-- Una sola caja abierta por bodega a la vez. Quién abre y quién cierra se guarda con su nombre (puede ser empleado o administrador).
CREATE TABLE cash_sessions (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id              BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    warehouse_id            BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    status                  VARCHAR(10) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'closed')),
    opened_by_actor_type    VARCHAR(20) NOT NULL,
    opened_by_actor_id      BIGINT NOT NULL,
    opened_by_name          VARCHAR(200) NOT NULL,
    opened_at               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    opening_amount          NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (opening_amount >= 0),
    closed_by_actor_type    VARCHAR(20),
    closed_by_actor_id      BIGINT,
    closed_by_name          VARCHAR(200),
    closed_at               TIMESTAMPTZ,
    cash_total              NUMERIC(14,2),
    transfer_total          NUMERIC(14,2),
    payments_count          INTEGER,
    expected_cash           NUMERIC(14,2),
    counted_cash            NUMERIC(14,2) CHECK (counted_cash IS NULL OR counted_cash >= 0),
    difference              NUMERIC(14,2),
    notes                   TEXT,
    CHECK (status = 'open' OR closed_at IS NOT NULL)
);

CREATE UNIQUE INDEX idx_cash_sessions_one_open_per_actor 
    ON cash_sessions (warehouse_id, opened_by_actor_type, opened_by_actor_id) 
    WHERE status = 'open';
CREATE INDEX idx_cash_sessions_company_opened ON cash_sessions (company_id, opened_at DESC);

-- 36c. TABLA: cash_session_expenses (gastos menores y operativos pagados desde la caja/tienda)
CREATE TABLE cash_session_expenses (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cash_session_id   BIGINT NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,
    expense_type      VARCHAR(50) NOT NULL DEFAULT 'other'
        CHECK (expense_type IN ('merchandise_arrival', 'payroll', 'loans', 'overtime', 'cleaning_supplies', 'services', 'other')),
    receipt_number    VARCHAR(60),
    concept           VARCHAR(200) NOT NULL,
    cash_amount       NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (cash_amount >= 0),
    transfer_amount   NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (transfer_amount >= 0),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (cash_amount + transfer_amount > 0)
);
CREATE INDEX idx_cash_session_expenses_session ON cash_session_expenses (cash_session_id);
CREATE INDEX idx_cash_session_expenses_type ON cash_session_expenses (expense_type);

-- 36. TABLA: payments
CREATE TABLE payments (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id                  BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    serial_code                 VARCHAR(40) NOT NULL,
    sale_id                     BIGINT NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
    customer_id                 BIGINT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    employee_id                 BIGINT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    verified_by_employee_id     BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    method                      VARCHAR(20) NOT NULL
        CHECK (method IN ('cash', 'transfer')),
    amount                      NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    status                      VARCHAR(20) NOT NULL DEFAULT 'review'
        CHECK (status IN ('review', 'verified', 'issue', 'voided')),
    proof_url                   TEXT,
    reference                   VARCHAR(100),
    issue_note                  TEXT,
    void_reason                 TEXT,
    verified_at                 TIMESTAMPTZ,
    cash_session_id             BIGINT REFERENCES cash_sessions(id) ON DELETE SET NULL,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, serial_code)
);

CREATE INDEX idx_payments_cash_session ON payments (cash_session_id);
CREATE INDEX idx_payments_sale_status ON payments (sale_id, status);
CREATE INDEX idx_payments_customer ON payments (customer_id);

-- 36d. TABLA: sale_stage_history (cuándo entró cada pedido a cada etapa, quién lo movió y cuándo salió)
CREATE TABLE sale_stage_history (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sale_id      BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    stage        VARCHAR(20) NOT NULL,
    employee_id  BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    entered_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    left_at      TIMESTAMPTZ
);
CREATE INDEX idx_sale_stage_history_sale ON sale_stage_history (sale_id, entered_at);

-- 37. TABLA: credit_entries (Libro único de crédito del cliente: < 0 deuda, > 0 saldo positivo a favor)
CREATE TABLE credit_entries (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    customer_id     BIGINT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    employee_id     BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    entry_type      VARCHAR(20) NOT NULL
        CHECK (entry_type IN ('charge', 'payment', 'return', 'adjust')),
    amount          NUMERIC(14,2) NOT NULL
        CHECK (
            (entry_type = 'charge' AND amount < 0)
            OR (entry_type IN ('payment', 'return') AND amount > 0)
            OR (entry_type = 'adjust' AND amount <> 0)
        ),
    sale_id         BIGINT REFERENCES sales(id) ON DELETE SET NULL,
    payment_id      BIGINT REFERENCES payments(id) ON DELETE SET NULL,
    return_id       BIGINT REFERENCES returns(id) ON DELETE SET NULL,
    reason          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_credit_entries_customer ON credit_entries (customer_id, created_at DESC);

-- 37b. TABLA: bank_statement_records (Careo de extractos bancarios y confirmación de transferencias)
CREATE TABLE bank_statement_records (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id          BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    bank_name           VARCHAR(80) NOT NULL DEFAULT 'Bancolombia',
    account_number      VARCHAR(50) NOT NULL DEFAULT '01400000369',
    movement_date       DATE NOT NULL,
    description         TEXT NOT NULL,
    branch_channel      VARCHAR(80) NOT NULL DEFAULT '',
    reference1          VARCHAR(100),
    reference2          VARCHAR(100),
    document_number     VARCHAR(80),
    amount              NUMERIC(14,2) NOT NULL,
    is_income           BOOLEAN NOT NULL DEFAULT TRUE,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending' 
                        CHECK (status IN ('pending', 'confirmed', 'ignored')),
    confirmed_by_id     BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    confirmed_at        TIMESTAMPTZ,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bank_stmt_filter ON bank_statement_records (company_id, movement_date, status);
CREATE INDEX idx_bank_stmt_desc ON bank_statement_records USING gin (description gin_trgm_ops);

-- 38. TABLA: purchases
CREATE TABLE purchases (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    serial_code     VARCHAR(40) NOT NULL,
    supplier_id     BIGINT NOT NULL REFERENCES externals(id) ON DELETE RESTRICT,
    warehouse_id    BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    employee_id     BIGINT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'ordered', 'partial', 'received', 'voided')),
    supplier_ref    VARCHAR(80),
    expected_date   DATE,
    subtotal        NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    iva_total       NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (iva_total >= 0),
    total           NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    notes           TEXT,
    received_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, serial_code)
);

CREATE INDEX idx_purchases_company_status ON purchases (company_id, status);

-- 39. TABLA: purchase_items
CREATE TABLE purchase_items (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    purchase_id     BIGINT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id      BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    received_qty    INTEGER NOT NULL DEFAULT 0
        CHECK (received_qty >= 0 AND received_qty <= quantity),
    unit_cost       NUMERIC(14,2) NOT NULL CHECK (unit_cost >= 0),
    iva_percent     NUMERIC(5,2)
        CHECK (iva_percent IS NULL OR (iva_percent >= 0 AND iva_percent <= 100)),
    subtotal        NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0)
);

CREATE INDEX idx_purchase_items_purchase ON purchase_items (purchase_id);

-- 40. TABLA: invoices (Emitidas desde la bodega usando warehouse_facturation)
CREATE TABLE invoices (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id                  BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    warehouse_id                BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    warehouse_facturation_id    BIGINT NOT NULL REFERENCES warehouse_facturation(id) ON DELETE RESTRICT,
    sale_id                     BIGINT NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
    return_id                   BIGINT REFERENCES returns(id) ON DELETE SET NULL,
    employee_id                 BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    kind                        VARCHAR(20) NOT NULL DEFAULT 'invoice'
        CHECK (kind IN ('invoice', 'credit_note')),
    number                      VARCHAR(50) NOT NULL,
    status                      VARCHAR(20) NOT NULL DEFAULT 'issued'
        CHECK (status IN ('pending', 'issued', 'annulled')),
    pdf_url                     TEXT,
    issued_at                   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (warehouse_id, number)
);

CREATE INDEX idx_invoices_sale ON invoices (sale_id);
CREATE INDEX idx_invoices_warehouse ON invoices (warehouse_id, issued_at DESC);


-- ------------------------------------------------------------
-- GRUPO 7: AUDITORÍA, NOTIFICACIONES Y MIGRACIONES (3)
-- ------------------------------------------------------------

-- 41. TABLA: audit_logs
CREATE TABLE audit_logs (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id      BIGINT REFERENCES companies(id) ON DELETE SET NULL,
    employee_id     BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    admin_id        BIGINT REFERENCES admins(id) ON DELETE SET NULL,
    superadmin_id   BIGINT REFERENCES superadmins(id) ON DELETE SET NULL,
    entity          VARCHAR(60) NOT NULL,
    entity_id       BIGINT,
    action          VARCHAR(40) NOT NULL,
    reason          TEXT,
    changes         JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address      VARCHAR(64),
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_company_created ON audit_logs (company_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity, entity_id);
CREATE INDEX idx_audit_logs_employee ON audit_logs (employee_id, created_at DESC);

CREATE TABLE audit_context_change (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_id            BIGINT NOT NULL,
    actor_type          VARCHAR(20) NOT NULL CHECK (actor_type = 'superadmin'),
    from_company_id     BIGINT REFERENCES companies(id) ON DELETE SET NULL,
    to_company_id       BIGINT REFERENCES companies(id) ON DELETE SET NULL,
    to_all_companies    BOOLEAN NOT NULL DEFAULT FALSE,
    ip                  VARCHAR(64),
    user_agent          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK ((to_all_companies AND to_company_id IS NULL) OR (NOT to_all_companies AND to_company_id IS NOT NULL))
);
CREATE INDEX idx_audit_context_change_actor_created ON audit_context_change (actor_id, created_at DESC);

-- 42. TABLA: notifications
CREATE TABLE notifications (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id     BIGINT REFERENCES employees(id) ON DELETE CASCADE,
    admin_id        BIGINT REFERENCES admins(id) ON DELETE CASCADE,
    kind            VARCHAR(20) NOT NULL DEFAULT 'info'
        CHECK (kind IN ('info', 'success', 'warning', 'error', 'restore_record')),
    title           VARCHAR(160) NOT NULL,
    body            TEXT,
    entity          VARCHAR(60),
    entity_id       BIGINT,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT notifications_recipient_check CHECK (num_nonnulls(employee_id, admin_id) = 1)
);

CREATE INDEX idx_notifications_employee_unread
    ON notifications (employee_id, created_at DESC)
    WHERE read_at IS NULL;
CREATE INDEX idx_notifications_admin_unread
    ON notifications (admin_id, created_at DESC)
    WHERE read_at IS NULL;

-- 43. TABLA: recycle_bin (Papelera de reciclaje y recuperación de entidades)
CREATE TABLE IF NOT EXISTS recycle_bin (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id              BIGINT REFERENCES companies(id) ON DELETE CASCADE,
    entity_table            VARCHAR(60) NOT NULL,
    entity_id               BIGINT NOT NULL,
    entity_label            VARCHAR(180) NOT NULL,
    entity_data             JSONB NOT NULL DEFAULT '{}'::jsonb,
    deleted_by_actor_type   VARCHAR(20) NOT NULL,
    deleted_by_actor_id     BIGINT NOT NULL,
    deleted_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_restored             BOOLEAN NOT NULL DEFAULT FALSE,
    restored_at             TIMESTAMPTZ,
    restored_by_actor_id    BIGINT
);
CREATE INDEX IF NOT EXISTS idx_recycle_bin_lookup ON recycle_bin (company_id, entity_table, is_restored);
CREATE INDEX IF NOT EXISTS idx_recycle_bin_date ON recycle_bin (deleted_at DESC);

-- 44. TABLA: schema_migrations (Compatible con src/db/migrations/migrator.js)
CREATE TABLE schema_migrations (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    version             TEXT NOT NULL UNIQUE,
    name                TEXT NOT NULL,
    filename            TEXT NOT NULL,
    checksum            TEXT NOT NULL,
    execution_time_ms   INTEGER NOT NULL DEFAULT 0,
    applied_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- PARTE 3: FUNCIONES LIGERAS, TRIGGERS Y VISTAS OPERATIVAS
-- ============================================================

-- Función automática para mantener updated_at al día
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_superadmins_updated_at
    BEFORE UPDATE ON superadmins
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_warehouses_updated_at
    BEFORE UPDATE ON warehouses
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_warehouse_facturation_updated_at
    BEFORE UPDATE ON warehouse_facturation
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_admins_updated_at
    BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_employee_login_attempts_updated_at
    BEFORE UPDATE ON employee_login_attempts
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_externals_updated_at
    BEFORE UPDATE ON externals
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_stock_updated_at
    BEFORE UPDATE ON stock
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_transfers_updated_at
    BEFORE UPDATE ON transfers
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_carts_updated_at
    BEFORE UPDATE ON carts
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_sales_updated_at
    BEFORE UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_quotations_updated_at
    BEFORE UPDATE ON quotations
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_purchases_updated_at
    BEFORE UPDATE ON purchases
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_warehouse_locations_updated_at
    BEFORE UPDATE ON warehouse_locations
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- 43. TABLA (se crea aquí, antes de su trigger y de la semilla): screensaver_settings (Configuración de protector de pantalla por empresa)
CREATE TABLE IF NOT EXISTS screensaver_settings (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    image_url       TEXT NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by      BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_screensaver_settings_company ON screensaver_settings(company_id, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_screensaver_settings_company_unique ON screensaver_settings(company_id);

CREATE TRIGGER trg_screensaver_settings_updated_at
    BEFORE UPDATE ON screensaver_settings
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- Auto-composición indexada del campo easysearch en productos
CREATE OR REPLACE FUNCTION fn_products_update_easysearch()
RETURNS TRIGGER AS $$
DECLARE
    v_brand_name    TEXT := '';
    v_model_name    TEXT := '';
    v_cat_name      TEXT := '';
    v_codes         TEXT := '';
BEGIN
    IF NEW.brand_id IS NOT NULL THEN
        SELECT name INTO v_brand_name FROM brands WHERE id = NEW.brand_id;
    END IF;
    IF NEW.model_id IS NOT NULL THEN
        SELECT name INTO v_model_name FROM models WHERE id = NEW.model_id;
    END IF;
    IF NEW.category_id IS NOT NULL THEN
        SELECT name INTO v_cat_name FROM categories WHERE id = NEW.category_id;
    END IF;

    SELECT COALESCE(string_agg(code, ' '), '') INTO v_codes
    FROM product_codes WHERE product_id = NEW.id;

    NEW.easysearch := UPPER(TRIM(CONCAT_WS(' ',
        NEW.code,
        NEW.name,
        COALESCE(v_brand_name, ''),
        COALESCE(v_model_name, ''),
        COALESCE(v_cat_name, ''),
        COALESCE(v_codes, ''),
        COALESCE(NEW.description, '')
    )));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_easysearch_biu
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION fn_products_update_easysearch();

-- Protección de inmutabilidad sobre audit_logs (solo inserción)
CREATE OR REPLACE FUNCTION fn_protect_audit_logs()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Los registros de audit_logs son inmutables y no pueden modificarse ni eliminarse';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_audit_logs
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION fn_protect_audit_logs();

-- Vista: Existencias detalladas por bodega y ubicación con unidades disponibles para venta
CREATE VIEW v_warehouse_stock AS
SELECT
    s.id AS stock_id,
    s.company_id,
    s.warehouse_id,
    w.code AS warehouse_code,
    w.name AS warehouse_name,
    s.product_id,
    p.code AS product_code,
    p.name AS product_name,
    p.category_id,
    c.name AS category_name,
    p.brand_id,
    b.name AS brand_name,
    p.model_id,
    m.name AS model_name,
    p.iva,
    COALESCE(
        (SELECT jsonb_object_agg(pp.price_tier, pp.price)
         FROM product_prices pp
         WHERE pp.product_id = p.id),
        '{}'::jsonb
    ) AS prices,
    s.location,
    s.available,
    s.reserved,
    (s.available - s.reserved) AS sellable,
    s.min_stock,
    s.max_stock,
    s.updated_at
FROM stock s
JOIN warehouses w ON w.id = s.warehouse_id
JOIN products p ON p.id = s.product_id
JOIN categories c ON c.id = p.category_id
LEFT JOIN brands b ON b.id = p.brand_id
LEFT JOIN models m ON m.id = p.model_id;

-- Vista: Stock consolidado por producto dentro de su propia compañía (sin préstamos entre compañías)
CREATE VIEW v_company_stock AS
SELECT
    s.company_id,
    s.product_id,
    p.code AS product_code,
    p.name AS product_name,
    SUM(s.available)::INTEGER AS available,
    SUM(s.reserved)::INTEGER AS reserved,
    SUM(s.available - s.reserved)::INTEGER AS sellable
FROM stock s
JOIN products p ON p.id = s.product_id
GROUP BY s.company_id, s.product_id, p.code, p.name;

-- Vista: Resumen lógico del crédito del cliente (credit_balance < 0 = deuda, > 0 = saldo positivo a favor)
CREATE VIEW v_customer_credit_summary AS
SELECT
    c.id AS customer_id,
    c.company_id,
    c.document_type,
    c.document,
    c.name,
    c.price_tier,
    c.discount_percent,
    c.credit_enabled,
    c.credit_limit,
    c.credit_days,
    c.credit_warning_pct,
    l.credit_balance,
    r.reserved_orders,
    GREATEST(c.credit_limit + l.credit_balance - r.reserved_orders, 0) AS available_credit
FROM customers c
CROSS JOIN LATERAL (
    SELECT COALESCE(SUM(e.amount), 0) AS credit_balance
    FROM credit_entries e
    WHERE e.customer_id = c.id
) l
CROSS JOIN LATERAL (
    SELECT COALESCE(SUM(s.total - s.paid_total), 0) AS reserved_orders
    FROM sales s
    WHERE s.customer_id = c.id
      AND s.status = 'open'
      AND s.sale_at IS NULL
      AND s.payment_method = 'credit'
) r;
-- Vista: Estado operativo de ubicaciones (libre si no tiene unidades, ocupada si tiene stock físico)
CREATE VIEW v_warehouse_locations_status AS
SELECT
    l.id AS location_id,
    l.company_id,
    l.warehouse_id,
    w.code AS warehouse_code,
    w.name AS warehouse_name,
    l.code AS location_code,
    l.description,
    l.qr_code,
    l.is_active,
    COALESCE(COUNT(DISTINCT s.product_id) FILTER (WHERE s.available > 0), 0) AS product_count,
    COALESCE(SUM(s.available), 0) AS total_units,
    COALESCE(SUM(s.reserved), 0) AS reserved_units,
    COALESCE(SUM(s.available - s.reserved), 0) AS sellable_units,
    CASE
        WHEN COALESCE(SUM(s.available), 0) = 0 THEN 'libre'
        ELSE 'ocupada'
    END AS occupancy_status
FROM warehouse_locations l
JOIN warehouses w ON w.id = l.warehouse_id
LEFT JOIN stock s ON s.warehouse_id = l.warehouse_id AND s.location = l.code
GROUP BY l.id, l.company_id, l.warehouse_id, w.code, w.name, l.code, l.description, l.qr_code, l.is_active;


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

-- ============================================================
-- PARTE 4: DATOS SEMILLA LIMPIOS DE OPERACIÓN (SEED DEMO)
-- ============================================================

-- ============================================================================
-- SCRIPT DE DATOS SEMILLA LIMPIOS (PGADMIN)
-- IMPORTADORA PREMIUM ONLINE SAS
-- Compatible con PostgreSQL V4 (Esquema Limpio)
-- ============================================================================

-- (sigue en la misma transaccion abierta al inicio del script)

-- 1. COMPAÑÍA PRINCIPAL
INSERT INTO companies (id, name, address, city, phone, email, is_active)
OVERRIDING SYSTEM VALUE
VALUES (1, 'IMPORTADORA PREMIUM ONLINE S.A.S.', 'CL 41 N 51 - 15', 'Medellín', '3126134771', 'contacto@importadorapremium.com', TRUE)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    city = EXCLUDED.city;

-- 2. TRES BODEGAS (BODEGA 1 PRINCIPAL, BODEGA 2 ONLINE, BODEGA 3 NORTE)
INSERT INTO warehouses (id, company_id, code, name, city, address, phone, is_active)
OVERRIDING SYSTEM VALUE
VALUES 
    (1, 1, 'BOD-01', 'PASEO BOLÍVAR', 'Medellín', 'CL 41 N 51 - 15 Medellín', '3126134771', TRUE),
    (2, 1, 'BOD-02', 'TIENDA ONLINE', 'Medellín', 'CRA 51 N 40 - 22 Bodega Despachos', '3126134771', TRUE),
    (3, 1, 'BOD-03', 'BODEGA NORTE / DISTRIBUCIÓN', 'Bello', 'KM 2 Autopista Norte Medellín', '3103803690', TRUE)
ON CONFLICT (id) DO UPDATE SET 
    code = EXCLUDED.code,
    name = EXCLUDED.name,
    address = EXCLUDED.address;

-- 3. CATEGORÍAS Y MARCAS
INSERT INTO categories (id, company_id, name, description)
OVERRIDING SYSTEM VALUE
VALUES 
    (1, 1, 'REPUESTOS Y MOTOR', 'Piezas de motor, mofles, abrazaderas y chasis'),
    (2, 1, 'LUBRICANTES Y FLUIDOS', 'Aceites 2T, 4T 20W50, 10W30 y aditivos'),
    (3, 1, 'FRENOS Y TRANSMISIÓN', 'Pastillas, bandas, discos, cadenas y piñones'),
    (4, 1, 'SISTEMA ELÉCTRICO', 'Baterías, bobinas, bujías y ramales'),
    (5, 1, 'ACCESORIOS Y CHASIS', 'Agarraderas, espejos, manilares y tapas')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO brands (id, company_id, name)
OVERRIDING SYSTEM VALUE
VALUES 
    (1, 1, 'BAJAJ'),
    (2, 1, 'YAMAHA'),
    (3, 1, 'HONDA'),
    (4, 1, 'SUZUKI')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 4. ROLES
INSERT INTO roles (id, company_id, code, name, description)
OVERRIDING SYSTEM VALUE
VALUES 
    (1, 1, 'SUPERADMIN', 'Superadministrador', 'Superadministrador con control total del sistema'),
    (2, 1, 'ADMIN', 'Administrador', 'Administrador de sede o sucursal'),
    (3, 1, 'SELLER', 'Vendedor', 'Vendedor de mostrador y pedidos'),
    (4, 1, 'WAREHOUSE', 'Bodeguero', 'Bodeguero y encargado de recepción de compras y despachos'),
    (5, 1, 'BILLING', 'Facturador / Cartera', 'Facturador y analista de cartera / cobranza'),
    (6, 1, 'CASHIER', 'Cajero', 'Cajero recaudador de pagos en efectivo')
ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name = EXCLUDED.name;

-- 5. USUARIOS DEL SISTEMA (SUPERADMINS, EMPLEADOS Y ADMINS)
-- Contraseña para todos los usuarios de prueba: "123456" ($2a$10$xo3irJ9IbTG.ju8iRMb2Iu4YB6KAe.XzeBtRkEo1aWXnChX84X2ne)

-- 5a. Superadministradores Globales
INSERT INTO superadmins (id, username, email, password_hash, first_name, last_name, phone, access_level, is_active)
OVERRIDING SYSTEM VALUE
VALUES
    (1, 'superadmin1', 'superadmin1@importadora.com', '$2a$10$xo3irJ9IbTG.ju8iRMb2Iu4YB6KAe.XzeBtRkEo1aWXnChX84X2ne', 'Carlos', 'Mario Administrador', '3001112233', 'developer', TRUE),
    (2, 'superadmin2', 'superadmin2@importadora.com', '$2a$10$xo3irJ9IbTG.ju8iRMb2Iu4YB6KAe.XzeBtRkEo1aWXnChX84X2ne', 'Patricia', 'Vega Auditora', '3001112234', 'developer', TRUE)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- 5b. Empleados y Operativos (2 por Rol con Bodega asignada)
INSERT INTO employees (id, company_id, role_id, warehouse_id, email, password_hash, first_name, last_name, document_type, document, phone, address, work_modality, employment_status, status)
OVERRIDING SYSTEM VALUE
VALUES
    -- Admins de sede (rol 2)
    (1, 1, 2, 1, 'admin.bolivar@importadora.com', '$2a$10$xo3irJ9IbTG.ju8iRMb2Iu4YB6KAe.XzeBtRkEo1aWXnChX84X2ne', 'Andrés Felipe', 'Ramos', 'CC', '1001001', '3001112235', 'Cra 43A # 1-50', 'onsite', 'active', 'active'),
    (2, 1, 2, 2, 'admin.online@importadora.com', '$2a$10$xo3irJ9IbTG.ju8iRMb2Iu4YB6KAe.XzeBtRkEo1aWXnChX84X2ne', 'Marcela', 'Gómez Restrepo', 'CC', '1001002', '3001112236', 'Calle 50 # 10-20', 'onsite', 'active', 'active'),
    -- Vendedores (rol 3)
    (3, 1, 3, 1, 'vendedor.bolivar@importadora.com', '$2a$10$xo3irJ9IbTG.ju8iRMb2Iu4YB6KAe.XzeBtRkEo1aWXnChX84X2ne', 'Juan Felipe', 'Montoya', 'CC', '1001003', '3001112237', 'Cra 70 # 30-10', 'onsite', 'active', 'active'),
    (4, 1, 3, 2, 'vendedor.online@importadora.com', '$2a$10$xo3irJ9IbTG.ju8iRMb2Iu4YB6KAe.XzeBtRkEo1aWXnChX84X2ne', 'Daniela', 'Arango Posada', 'CC', '1001004', '3001112238', 'Diag 40 # 12-05', 'onsite', 'active', 'active'),
    -- Bodegueros (rol 4)
    (5, 1, 4, 1, 'bodega.bolivar@importadora.com', '$2a$10$xo3irJ9IbTG.ju8iRMb2Iu4YB6KAe.XzeBtRkEo1aWXnChX84X2ne', 'Jhon Alexander', 'Pérez', 'CC', '1001005', '3001112239', 'Calle 10 # 50-30', 'onsite', 'active', 'active'),
    (6, 1, 4, 3, 'bodega.norte@importadora.com', '$2a$10$xo3irJ9IbTG.ju8iRMb2Iu4YB6KAe.XzeBtRkEo1aWXnChX84X2ne', 'Kevin', 'Morales Duarte', 'CC', '1001006', '3001112240', 'Av 33 # 80-12', 'onsite', 'active', 'active'),
    -- Facturación y Cartera (rol 5)
    (7, 1, 5, 1, 'cartera1@importadora.com', '$2a$10$xo3irJ9IbTG.ju8iRMb2Iu4YB6KAe.XzeBtRkEo1aWXnChX84X2ne', 'Laura Sofía', 'Castro', 'CC', '1001007', '3001112241', 'Cra 80 # 40-15', 'onsite', 'active', 'active'),
    (8, 1, 5, 2, 'facturacion2@importadora.com', '$2a$10$xo3irJ9IbTG.ju8iRMb2Iu4YB6KAe.XzeBtRkEo1aWXnChX84X2ne', 'Esteban', 'Restrepo Ruiz', 'CC', '1001008', '3001112242', 'Calle 65 # 20-40', 'onsite', 'active', 'active'),
    -- Cajeros (rol 6)
    (9, 1, 6, 1, 'caja.bolivar@importadora.com', '$2a$10$xo3irJ9IbTG.ju8iRMb2Iu4YB6KAe.XzeBtRkEo1aWXnChX84X2ne', 'Juliana', 'Henao López', 'CC', '1001009', '3001112243', 'Cra 50 # 10-25', 'onsite', 'active', 'active'),
    (10, 1, 6, 2, 'caja.online@importadora.com', '$2a$10$xo3irJ9IbTG.ju8iRMb2Iu4YB6KAe.XzeBtRkEo1aWXnChX84X2ne', 'Santiago', 'Osorio Cano', 'CC', '1001010', '3001112244', 'Calle 25 # 70-11', 'onsite', 'active', 'active')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- 5c. Administradores de Compañía (vinculados al empleado correspondiente)
INSERT INTO admins (id, company_id, employee_id, created_by_superadmin_id, email, password_hash, first_name, last_name, document_type, document, phone, is_active)
OVERRIDING SYSTEM VALUE
VALUES
    (1, 1, 1, 1, 'admin.bolivar@importadora.com', '$2a$10$xo3irJ9IbTG.ju8iRMb2Iu4YB6KAe.XzeBtRkEo1aWXnChX84X2ne', 'Andrés Felipe', 'Ramos', 'CC', '1001001', '3001112235', TRUE),
    (2, 1, 2, 1, 'admin.online@importadora.com', '$2a$10$xo3irJ9IbTG.ju8iRMb2Iu4YB6KAe.XzeBtRkEo1aWXnChX84X2ne', 'Marcela', 'Gómez Restrepo', 'CC', '1001002', '3001112236', TRUE)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- CATÁLOGO DE PERMISOS: cada módulo con las acciones que la matriz de permisos puede encender (ver, ver detalle, crear, editar, cambiar estado, borrar y, en productos y catálogo, editar precios)
-- Los roles son solo etiquetas: cualquier permiso se le puede dar a cualquier empleado. La API exige estos permisos en cada ruta que cambia datos y en las lecturas sensibles.
INSERT INTO permissions (module, action, description)
SELECT m.module, a.action, m.label || ' · ' || a.label
FROM (VALUES
    ('catalog', 'Catálogo de la tienda'), ('quotations', 'Cotizaciones'), ('orders', 'Pedidos y facturas'), ('cash', 'Caja'),
    ('returns', 'Devoluciones y garantías'), ('purchases', 'Compras'), ('suppliers', 'Proveedores y transportadoras'), ('products', 'Productos'),
    ('transfers', 'Traslados entre bodegas'), ('brands', 'Marcas'), ('categories', 'Categorías'), ('models', 'Modelos'),
    ('stock', 'Inventario, conteos y ubicaciones'), ('credits', 'Créditos y cartera'), ('payments', 'Pagos y conciliación bancaria'),
    ('customers', 'Clientes'), ('employees', 'Empleados'), ('roles', 'Roles y permisos'), ('reports', 'Reportes'),
    ('audit', 'Auditoría y papelera'), ('warehouses', 'Sedes y series de documentos')
) AS m(module, label)
CROSS JOIN (VALUES
    ('view', 'ver'), ('view_detail', 'ver detalle'), ('create', 'crear'), ('edit', 'editar'), ('change_status', 'cambiar estado'), ('delete', 'borrar')
) AS a(action, label)
ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description)
SELECT m.module, a.action, m.label || ' · ' || a.label
FROM (VALUES ('products', 'Productos'), ('catalog', 'Catálogo de la tienda')) AS m(module, label)
CROSS JOIN (VALUES ('edit_prices', 'editar precios'), ('update_prices', 'actualizar precios')) AS a(action, label)
ON CONFLICT (module, action) DO NOTHING;

-- PERMISOS INICIALES DE LOS EMPLEADOS DE PRUEBA (solo punto de partida: se editan desde Roles y permisos; el rol es solo una etiqueta)
-- ADMIN: todos. Los demás según lo que hace cada puesto.
INSERT INTO employee_permissions (employee_id, permission_id)
SELECT e.id, p.id
FROM employees e
JOIN roles r ON r.id = e.role_id
JOIN permissions p ON (
    r.code = 'ADMIN'
    OR (r.code = 'SELLER' AND (
        (p.module = 'catalog')
        OR (p.module = 'quotations' AND p.action IN ('view', 'view_detail', 'create', 'edit'))
        OR (p.module = 'orders' AND p.action IN ('view', 'view_detail', 'create'))
        OR (p.module = 'customers' AND p.action IN ('view', 'view_detail', 'create', 'edit'))
        OR (p.module IN ('products', 'stock') AND p.action IN ('view', 'view_detail'))
        OR (p.module = 'transfers' AND p.action IN ('view', 'view_detail', 'create'))))
    OR (r.code = 'WAREHOUSE' AND (
        (p.module = 'orders' AND p.action IN ('view', 'view_detail', 'edit'))
        OR (p.module IN ('transfers', 'stock', 'purchases') AND p.action IN ('view', 'view_detail', 'create', 'edit'))
        OR (p.module = 'products' AND p.action IN ('view', 'view_detail'))))
    OR (r.code = 'BILLING' AND (
        (p.module = 'orders' AND p.action IN ('view', 'view_detail', 'edit'))
        OR (p.module IN ('credits', 'payments') AND p.action IN ('view', 'view_detail', 'create', 'edit'))
        OR (p.module IN ('customers', 'quotations', 'returns', 'reports') AND p.action IN ('view', 'view_detail'))))
    OR (r.code = 'CASHIER' AND (
        (p.module IN ('cash', 'payments') AND p.action IN ('view', 'view_detail', 'create', 'edit'))
        OR (p.module = 'orders' AND p.action IN ('view', 'view_detail', 'edit'))
        OR (p.module IN ('customers', 'returns') AND p.action IN ('view', 'view_detail'))))
)
ON CONFLICT (employee_id, permission_id) DO NOTHING;

-- 6. TERCEROS: PROVEEDORES Y TRANSPORTADORAS REALES (externals)
INSERT INTO externals (id, company_id, kind, document_type, document, name, contact_name, phone, email, coverage, is_active)
OVERRIDING SYSTEM VALUE
VALUES 
    (10, 1, 'supplier', 'NIT', '900123456', 'BAJAJ COLOMBIA MOTORS S.A.S.', 'BAJAJ OFICIAL', '3120001122', 'proveedores@bajaj.com.co', 'Nacional', TRUE),
    (11, 1, 'supplier', 'NIT', '900987654', 'DISTRIBUIDORA DE REPUESTOS JAPON SAS', 'REPUESTOS JAPON', '3158889900', 'ventas@japonrepuestos.com', 'Nacional', TRUE),
    (12, 1, 'carrier', 'NIT', '860000123', 'SERVIENTREGA S.A.', 'CONTACTO OPERACIONES', '3187770011', 'operaciones@servientrega.com', 'Nacional Express', TRUE),
    (13, 1, 'carrier', 'NIT', '890900456', 'ENVIA COLVANES S.A.S.', 'DESPACHOS NACIONALES', '3174445566', 'servicio@envia.co', 'Nacional y Regional', TRUE),
    (14, 1, 'carrier', 'NIT', '800111222', 'INTERRAPIDISIMO S.A.', 'ATENCIÓN LOGÍSTICA', '3162223344', 'contacto@interrapidisimo.com', 'Urbano y Nacional', TRUE)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, coverage = EXCLUDED.coverage;

-- 7. CLIENTES DE PRUEBA (customers)
-- A. Cliente Mostrador por defecto
INSERT INTO customers (id, company_id, document_type, document, person_type, name, trade_name, address, city, phone, mobile, credit_enabled, credit_limit, credit_days, credit_warning_pct, status)
OVERRIDING SYSTEM VALUE
VALUES (1, 1, 'NIT', '222222222222', 'legal', 'Consumidor Final', 'Cliente Mostrador', 'Calle 10 # 15-20 Centro', 'Cali', '3104509988', '3104509988', FALSE, 0.00, 0, 70.00, 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, city = EXCLUDED.city, phone = EXCLUDED.phone, mobile = EXCLUDED.mobile, credit_warning_pct = EXCLUDED.credit_warning_pct;

-- B. Cliente con cupo disponible normal (0% ocupado)
INSERT INTO customers (id, company_id, document_type, document, person_type, name, trade_name, address, city, phone, mobile, credit_enabled, credit_limit, credit_days, credit_warning_pct, status)
OVERRIDING SYSTEM VALUE
VALUES (2, 1, 'CC', '1004260479', 'natural', 'VICTOR MANUEL ROJAS', 'TALLER ROJAS', 'Carrera 45 # 22-10 Barrio San Fernando', 'Cali', '3128904512', '3128904512', TRUE, 2000000.00, 30, 70.00, 'active')
ON CONFLICT (id) DO UPDATE SET credit_limit = EXCLUDED.credit_limit, address = EXCLUDED.address, city = EXCLUDED.city, phone = EXCLUDED.phone, mobile = EXCLUDED.mobile, credit_warning_pct = EXCLUDED.credit_warning_pct;

-- C. Cliente con 75% de crédito ocupado (Para disparar anuncio de advertencia >= 70%)
INSERT INTO customers (id, company_id, document_type, document, person_type, name, trade_name, address, city, phone, mobile, credit_enabled, credit_limit, credit_days, credit_warning_pct, status)
OVERRIDING SYSTEM VALUE
VALUES (3, 1, 'NIT', '901555444', 'legal', 'MOTO REPUESTOS EL PAISA SAS', 'EL PAISA MOTOS', 'Avenida 6N # 28N-40 Versalles', 'Cali', '3187765432', '3187765432', TRUE, 5000000.00, 30, 70.00, 'active')
ON CONFLICT (id) DO UPDATE SET credit_limit = EXCLUDED.credit_limit, address = EXCLUDED.address, city = EXCLUDED.city, phone = EXCLUDED.phone, mobile = EXCLUDED.mobile, credit_warning_pct = EXCLUDED.credit_warning_pct;

-- Asignar saldo de deuda de $3.750.000 (75% de 5M)
INSERT INTO credit_entries (company_id, customer_id, entry_type, amount, reason)
VALUES (1, 3, 'charge', -3750000.00, 'Saldo inicial cargado para prueba de advertencia de cupo al 75%')
ON CONFLICT DO NOTHING;

-- D. Cliente en mora (Facturas vencidas)
INSERT INTO customers (id, company_id, document_type, document, person_type, name, trade_name, address, city, phone, mobile, credit_enabled, credit_limit, credit_days, credit_warning_pct, status)
OVERRIDING SYSTEM VALUE
VALUES (4, 1, 'NIT', '900333222', 'legal', 'DISTRIBUIDORA MOTOSUR LTDA', 'MOTOSUR', 'Calle 5 # 38-50 Tequendama', 'Cali', '3209876543', '3209876543', TRUE, 3000000.00, 15, 70.00, 'overdue')
ON CONFLICT (id) DO UPDATE SET status = 'overdue', address = EXCLUDED.address, city = EXCLUDED.city, phone = EXCLUDED.phone, mobile = EXCLUDED.mobile, credit_limit = EXCLUDED.credit_limit;

-- 8. FUNCIÓN AUXILIAR TEMPORAL PARA CREAR PRODUCTOS EN BATCH
CREATE OR REPLACE FUNCTION seed_product(
    p_company_id BIGINT,
    p_category_id BIGINT,
    p_brand_id BIGINT,
    p_code VARCHAR(80),
    p_name VARCHAR(200),
    p_desc TEXT,
    p_cost NUMERIC(14,2),
    p_price NUMERIC(14,2),
    p_oem VARCHAR(80),
    p_stk1 INT,
    p_stk2 INT,
    p_stk3 INT,
    p_easy TEXT
) RETURNS VOID AS $$
DECLARE
    v_prod_id BIGINT;
BEGIN
    INSERT INTO products (company_id, category_id, brand_id, code, name, description, unit, iva, last_cost, easysearch, status)
    VALUES (p_company_id, p_category_id, p_brand_id, p_code, p_name, p_desc, 'UND', 19.00, p_cost, p_easy, 'active')
    ON CONFLICT (company_id, code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        last_cost = EXCLUDED.last_cost
    RETURNING id INTO v_prod_id;

    -- Código OEM alternativo
    IF p_oem IS NOT NULL AND p_oem <> '' THEN
        INSERT INTO product_codes (company_id, product_id, code_type, code)
        VALUES (p_company_id, v_prod_id, 'oem', p_oem)
        ON CONFLICT (company_id, code_type, code) DO NOTHING;
    END IF;

    -- Proveedor y costo
    INSERT INTO product_suppliers (product_id, supplier_id, cost, supplier_code)
    VALUES (v_prod_id, 10, p_cost, p_oem)
    ON CONFLICT (product_id, supplier_id) DO UPDATE SET cost = EXCLUDED.cost;

    -- Precio de Venta Especial (P1)
    INSERT INTO product_prices (company_id, product_id, price_tier, price)
    VALUES (p_company_id, v_prod_id, 'p1', p_price)
    ON CONFLICT (product_id, price_tier) DO UPDATE SET price = EXCLUDED.price;

    -- Demás tarifas: p2 Taller 95 %, p3 Distribuidor 90 %, p4 Mayorista 85 % de p1, redondeadas a 100 pesos (misma regla de la migración 007)
    IF p_price > 0 THEN
        INSERT INTO product_prices (company_id, product_id, price_tier, price)
        SELECT p_company_id, v_prod_id, t.price_tier, ROUND(p_price * t.percent / 100 / 100) * 100
        FROM (VALUES ('p2', 95), ('p3', 90), ('p4', 85)) AS t(price_tier, percent)
        ON CONFLICT (product_id, price_tier) DO UPDATE SET price = EXCLUDED.price;
    END IF;

    -- Stock distribuido en las 3 bodegas
    -- Bodega 1 (Principal): Mayor inventario
    INSERT INTO stock (company_id, product_id, warehouse_id, location, available, reserved, min_stock)
    VALUES (p_company_id, v_prod_id, 1, 'ESTANTE-P1-01', p_stk1, 0, 5)
    ON CONFLICT (product_id, warehouse_id, location) DO UPDATE SET available = EXCLUDED.available;

    -- Bodega 2 (Online): Despachos
    INSERT INTO stock (company_id, product_id, warehouse_id, location, available, reserved, min_stock)
    VALUES (p_company_id, v_prod_id, 2, 'ESTANTE-ON-02', p_stk2, 0, 3)
    ON CONFLICT (product_id, warehouse_id, location) DO UPDATE SET available = EXCLUDED.available;

    -- Bodega 3 (Norte): Satélite
    INSERT INTO stock (company_id, product_id, warehouse_id, location, available, reserved, min_stock)
    VALUES (p_company_id, v_prod_id, 3, 'ESTANTE-NORTE-01', p_stk3, 0, 2)
    ON CONFLICT (product_id, warehouse_id, location) DO UPDATE SET available = EXCLUDED.available;
END;
$$ LANGUAGE plpgsql;

-- 9. INSERCIÓN DE 65 PRODUCTOS REALES (EXTRAÍDOS DE LISTA EXEL.xlsx)

SELECT seed_product(1, 1, 1, 'AP121064-1', 'ABRAZADERA PULSAR 180 UG', 'ABRAZADERA', 1134.00, 1700.00, 'AP121064', 29, 14, 9, 'AP121064-1 AP121064 ABRAZADERA PULSAR 180 UG BAJAJ');
SELECT seed_product(1, 1, 1, 'JG591038-1', 'ABRAZADERA PULSAR 200 NS', 'ABRAZADERA', 7143.00, 14900.00, 'JG591038', 15, 7, 5, 'JG591038-1 JG591038 ABRAZADERA PULSAR 200 NS BAJAJ');
SELECT seed_product(1, 1, 1, 'DG121002-1', 'ABRAZADERA UNIVERSAL', 'ABRAZADERA', 206.00, 300.00, 'DG121002', 1, 5, 3, 'DG121002-1 DG121002 ABRAZADERA UNIVERSAL BAJAJ');
SELECT seed_product(1, 1, 1, 'BAJAJ1LTR', 'ACEITE 10W30', 'ACEITE', 16970.00, 25000.00, 'BAJAJ1LTR', 18, 9, 6, 'BAJAJ1LTR BAJAJ1LTR ACEITE 10W30 BAJAJ');
SELECT seed_product(1, 1, 1, 'BGO10W50-1LT2W', 'ACEITE 10W50', 'ACEITE', 23323.00, 30000.00, 'BGO10W50', 15, 7, 5, 'BGO10W50-1LT2W BGO10W50 ACEITE 10W50 BAJAJ');
SELECT seed_product(1, 1, 1, 'ACEBAJAJ1', 'ACEITE 20W50', 'ACEITE', 15693.00, 24800.00, 'ACEBAJAJ1', 109, 54, 36, 'ACEBAJAJ1 ACEBAJAJ1 ACEITE 20W50 BAJAJ');
SELECT seed_product(1, 1, 1, 'ACEBAJAJ', 'ACEITE 20W50', 'ACEITE', 26782.00, 29600.00, 'ACEBAJAJ', 133, 66, 44, 'ACEBAJAJ ACEBAJAJ ACEITE 20W50 BAJAJ');
SELECT seed_product(1, 1, 1, 'BAJAJ1.2D', 'ACEITE 20W50', 'ACEITE', 25195.00, 38000.00, 'BAJAJ1.2D', 953, 476, 317, 'BAJAJ1.2D BAJAJ1.2D ACEITE 20W50 BAJAJ');
SELECT seed_product(1, 1, 1, 'BAJAJ115', 'ACEITE BAJAJ', 'ACEITE', 17000.00, 26500.00, 'BAJAJ115', 92, 46, 30, 'BAJAJ115 BAJAJ115 ACEITE BAJAJ BAJAJ');
SELECT seed_product(1, 1, 1, 'JK231400-1', 'AGARRADERA PLATINO 100', 'AGARRADERA', 19000.00, 28300.00, 'JK231400', 15, 7, 5, 'JK231400-1 JK231400 AGARRADERA PLATINO 100 BAJAJ');
SELECT seed_product(1, 1, 1, 'DK161147-1', 'AGARRADERA PULSAR 180 UG', 'AGARRADERA', 11408.00, 19000.00, 'DK161147', 6, 3, 2, 'DK161147-1 DK161147 AGARRADERA PULSAR 180 UG BAJAJ');
SELECT seed_product(1, 1, 1, 'DK161148-1', 'AGARRADERA PULSAR 180 UG', 'AGARRADERA', 11407.00, 29900.00, 'DK161148', 6, 3, 2, 'DK161148-1 DK161148 AGARRADERA PULSAR 180 UG BAJAJ');
SELECT seed_product(1, 1, 1, 'JL231404-1', 'AGARRADERA PULSAR 200 NS', 'AGARRADERA', 16280.00, 37900.00, 'JL231404', 2, 1, 3, 'JL231404-1 JL231404 AGARRADERA PULSAR 200 NS BAJAJ');
SELECT seed_product(1, 1, 1, 'JL231045-1', 'AGARRADERA PULSAR 200 NS', 'AGARRADERA', 0.00, 0.00, 'JL231045', 15, 7, 5, 'JL231045-1 JL231045 AGARRADERA PULSAR 200 NS BAJAJ');
SELECT seed_product(1, 1, 1, 'JL231405-1', 'AGARRADERA PULSAR 200 NS', 'AGARRADERA', 16512.00, 24600.00, 'JL231405', 1, 5, 3, 'JL231405-1 JL231405 AGARRADERA PULSAR 200 NS BAJAJ');
SELECT seed_product(1, 1, 1, 'JB581229-1', 'AGUJA CARBURADOR BOXER CT100', 'AGUJA CARBURADOR', 4286.00, 13900.00, 'JB581229', 8, 4, 2, 'JB581229-1 JB581229 AGUJA CARBURADOR BOXER CT100 BAJAJ');
SELECT seed_product(1, 1, 1, 'DJ121044-1', 'AGUJA CORTINA CARBURADOR PULSAR 180 UG', 'AGUJA CORTINA CARBURADOR', 8831.00, 27900.00, 'DJ121044', 15, 7, 5, 'DJ121044-1 DJ121044 AGUJA CORTINA CARBURADOR PULSAR 180 UG BAJAJ');
SELECT seed_product(1, 1, 1, 'DD121168-1', 'AGUJA DE ACIENTO BOXER CT', 'AGUJA DE ACIENTO', 7396.00, 15900.00, 'DD121168', 99, 49, 33, 'DD121168-1 DD121168 AGUJA DE ACIENTO BOXER CT BAJAJ');
SELECT seed_product(1, 1, 1, 'DS121076-1', 'AGUJA DE ACIENTO DISCOVER 135', 'AGUJA DE ACIENTO', 15000.00, 26900.00, 'DS121076', 1, 5, 3, 'DS121076-1 DS121076 AGUJA DE ACIENTO DISCOVER 135 BAJAJ');
SELECT seed_product(1, 1, 1, 'DH121093-1', 'AGUJA DE ACIENTO PULSAR 135', 'AGUJA DE ACIENTO', 8193.00, 27900.00, 'DH121093', 25, 12, 8, 'DH121093-1 DH121093 AGUJA DE ACIENTO PULSAR 135 BAJAJ');
SELECT seed_product(1, 1, 1, 'DJ121057-1', 'AGUJA DE ACIENTO PULSAR 180 UG', 'AGUJA DE ACIENTO', 18487.00, 27500.00, 'DJ121057', 46, 23, 15, 'DJ121057-1 DJ121057 AGUJA DE ACIENTO PULSAR 180 UG BAJAJ');
SELECT seed_product(1, 1, 1, 'DK121047-1', 'AGUJA DE ACIENTO PULSAR 200 NS', 'AGUJA DE ACIENTO', 18796.00, 15900.00, 'DK121047', 1, 5, 3, 'DK121047-1 DK121047 AGUJA DE ACIENTO PULSAR 200 NS BAJAJ');
SELECT seed_product(1, 1, 1, 'JZ181007-1', 'ALCUTRAS DISCOVER 125 ST', 'ALCUTRAS', 4732.00, 7000.00, 'JZ181007', 15, 7, 5, 'JZ181007-1 JZ181007 ALCUTRAS DISCOVER 125 ST BAJAJ');
SELECT seed_product(1, 1, 1, 'PF121003-1', 'ALETA FAROLA BOXER BM 100', 'ALETA FAROLA', 9435.00, 13900.00, 'PF121003', 4, 2, 1, 'PF121003-1 PF121003 ALETA FAROLA BOXER BM 100 BAJAJ');
SELECT seed_product(1, 1, 1, 'PF121002-1', 'ALETA FAROLA BOXER BM 100', 'ALETA FAROLA', 10840.00, 15900.00, 'PF121002', 15, 7, 5, 'PF121002-1 PF121002 ALETA FAROLA BOXER BM 100 BAJAJ');
SELECT seed_product(1, 1, 1, '52DJ0373-1', 'ALETA TANQUE PULSAR 180 UG', 'ALETA TANQUE', 17411.00, 25900.00, '52DJ0373', 15, 7, 5, '52DJ0373-1 52DJ0373 ALETA TANQUE PULSAR 180 UG BAJAJ');
SELECT seed_product(1, 1, 1, '52DJ0374-1', 'ALETA TANQUE PULSAR 180 UG', 'ALETA TANQUE', 14144.00, 24500.00, '52DJ0374', 5, 2, 1, '52DJ0374-1 52DJ0374 ALETA TANQUE PULSAR 180 UG BAJAJ');
SELECT seed_product(1, 1, 1, 'PF122005-1', 'AMORTIGUADOR BOXER BM 100', 'AMORTIGUADOR', 44302.00, 75000.00, 'PF122005', 15, 7, 5, 'PF122005-1 PF122005 AMORTIGUADOR BOXER BM 100 BAJAJ');
SELECT seed_product(1, 1, 1, 'DZ171016-1', 'AMORTIGUADOR BOXER CT', 'AMORTIGUADOR', 39312.00, 59900.00, 'DZ171016', 77, 38, 25, 'DZ171016-1 DZ171016 AMORTIGUADOR BOXER CT BAJAJ');
SELECT seed_product(1, 1, 1, 'DM171027-1', 'AMORTIGUADOR BOXER CT', 'AMORTIGUADOR', 39058.00, 59900.00, 'DM171027', 10, 5, 3, 'DM171027-1 DM171027 AMORTIGUADOR BOXER CT BAJAJ');
SELECT seed_product(1, 1, 1, 'PA122026-1', 'AMORTIGUADOR DISCOVER 100', 'AMORTIGUADOR', 49580.00, 73800.00, 'PA122026', 15, 7, 5, 'PA122026-1 PA122026 AMORTIGUADOR DISCOVER 100 BAJAJ');
SELECT seed_product(1, 1, 1, 'JN122000-1', 'AMORTIGUADOR DISCOVER 135', 'AMORTIGUADOR', 64149.00, 95000.00, 'JN122000', 10, 5, 3, 'JN122000-1 JN122000 AMORTIGUADOR DISCOVER 135 BAJAJ');
SELECT seed_product(1, 1, 1, 'JF122013-1', 'AMORTIGUADOR DOMINAR 400 UG', 'AMORTIGUADOR', 201008.00, 299000.00, 'JF122013', 1, 5, 3, 'JF122013-1 JF122013 AMORTIGUADOR DOMINAR 400 UG BAJAJ');
SELECT seed_product(1, 1, 1, '24171063-1', 'AMORTIGUADOR MOTO CARRO RE 205', 'AMORTIGUADOR', 57748.00, 85900.00, '24171063', 2, 1, 3, '24171063-1 24171063 AMORTIGUADOR MOTO CARRO RE 205 BAJAJ');
SELECT seed_product(1, 1, 1, 'JD122003-1', 'AMORTIGUADOR PULSAR 135', 'AMORTIGUADOR', 76405.00, 152000.00, 'JD122003', 9, 4, 3, 'JD122003-1 JD122003 AMORTIGUADOR PULSAR 135 BAJAJ');
SELECT seed_product(1, 1, 1, 'DJ171019-1', 'AMORTIGUADOR PULSAR 180 II', 'AMORTIGUADOR', 49159.00, 79000.00, 'DJ171019', 2, 1, 3, 'DJ171019-1 DJ171019 AMORTIGUADOR PULSAR 180 II BAJAJ');
SELECT seed_product(1, 1, 1, 'JC171003-1', 'AMORTIGUADOR PULSAR 180 UG', 'AMORTIGUADOR', 57629.00, 85000.00, 'JC171003', 10, 5, 3, 'JC171003-1 JC171003 AMORTIGUADOR PULSAR 180 UG BAJAJ');
SELECT seed_product(1, 1, 1, 'DK171014-1', 'AMORTIGUADOR PULSAR 180 UG', 'AMORTIGUADOR', 53781.00, 80000.00, 'DK171014', 75, 37, 25, 'DK171014-1 DK171014 AMORTIGUADOR PULSAR 180 UG BAJAJ');
SELECT seed_product(1, 1, 1, '36PA0003-1', 'ANILLOS BOXER BM 100', 'ANILLOS', 15300.00, 21900.00, '36PA0003', 10, 5, 3, '36PA0003-1 36PA0003 ANILLOS BOXER BM 100 BAJAJ');
SELECT seed_product(1, 1, 1, '36DD4001-1', 'ANILLOS BOXER CT', 'ANILLOS', 9664.00, 14400.00, '36DD4001', 45, 22, 15, '36DD4001-1 36DD4001 ANILLOS BOXER CT BAJAJ');
SELECT seed_product(1, 1, 1, '36PF0062-1', 'ANILLOS BOXER CT 102 ES/KS', 'ANILLOS', 13214.00, 20900.00, '36PF0062', 15, 7, 5, '36PF0062-1 36PF0062 ANILLOS BOXER CT 102 ES/KS BAJAJ');
SELECT seed_product(1, 1, 1, '36DJ4008-1', 'ANILLOS DISCOVER 135', 'ANILLOS', 10898.00, 27900.00, '36DJ4008', 7, 3, 2, '36DJ4008-1 36DJ4008 ANILLOS DISCOVER 135 BAJAJ');
SELECT seed_product(1, 1, 1, '36JF0026-1', 'ANILLOS DISCOVER 150 ST', 'ANILLOS', 14280.00, 25600.00, '36JF0026', 6, 3, 2, '36JF0026-1 36JF0026 ANILLOS DISCOVER 150 ST BAJAJ');
SELECT seed_product(1, 1, 1, '36JF0060-1', 'ANILLOS DOMINAR 400', 'ANILLOS', 18600.00, 27700.00, '36JF0060', 18, 9, 6, '36JF0060-1 36JF0060 ANILLOS DOMINAR 400 BAJAJ');
SELECT seed_product(1, 1, 1, '36JE0002-1', 'ANILLOS PULSAR 135', 'ANILLOS', 12317.00, 17000.00, '36JE0002', 25, 12, 8, '36JE0002-1 36JE0002 ANILLOS PULSAR 135 BAJAJ');
SELECT seed_product(1, 1, 1, '36JF0042-1', 'ANILLOS PULSAR 160 NS', 'ANILLOS', 13291.00, 18900.00, '36JF0042', 5, 2, 1, '36JF0042-1 36JF0042 ANILLOS PULSAR 160 NS BAJAJ');
SELECT seed_product(1, 1, 1, 'DJ101106-1', 'ANILLOS PULSAR 180 UG', 'ANILLOS', 9240.00, 17000.00, 'DJ101106', 22, 11, 7, 'DJ101106-1 DJ101106 ANILLOS PULSAR 180 UG BAJAJ');
SELECT seed_product(1, 1, 1, '36JU0001-1', 'ANILLOS PULSAR 200 NS', 'ANILLOS', 12644.00, 19900.00, '36JU0001', 11, 5, 3, '36JU0001-1 36JU0001 ANILLOS PULSAR 200 NS BAJAJ');
SELECT seed_product(1, 1, 1, 'DE151048-1', 'ANTIRRUIDO PASTILLA DISCOVER 125', 'ANTIRRUIDO PASTILLA', 2100.00, 3500.00, 'DE151048', 13, 6, 4, 'DE151048-1 DE151048 ANTIRRUIDO PASTILLA DISCOVER 125 BAJAJ');
SELECT seed_product(1, 1, 1, 'DK151041-1', 'ANTIRRUIDO PASTILLA PULSAR 180 UG', 'ANTIRRUIDO PASTILLA', 2890.00, 4300.00, 'DK151041', 9, 4, 3, 'DK151041-1 DK151041 ANTIRRUIDO PASTILLA PULSAR 180 UG BAJAJ');
SELECT seed_product(1, 1, 1, 'JE541038-1', 'ANTIVIBRANTE DISCOVER 150 ST', 'ANTIVIBRANTE', 5311.00, 7900.00, 'JE541038', 5, 2, 1, 'JE541038-1 JE541038 ANTIVIBRANTE DISCOVER 150 ST BAJAJ');
SELECT seed_product(1, 1, 1, 'DJ151068-1', 'ANTIVIBRANTE PULSAR 180', 'ANTIVIBRANTE', 2332.00, 3500.00, 'DJ151068', 38, 19, 12, 'DJ151068-1 DJ151068 ANTIVIBRANTE PULSAR 180 BAJAJ');
SELECT seed_product(1, 1, 1, '39260011-1', 'ARANDELA  CLUTCH PULSAR 135', 'ARANDELA  CLUTCH', 1261.00, 1900.00, '39260011', 15, 7, 5, '39260011-1 39260011 ARANDELA  CLUTCH PULSAR 135 BAJAJ');
SELECT seed_product(1, 1, 1, 'JG551428-10', 'ARANDELA  CLUTCH PULSAR 180 UG', 'ARANDELA  CLUTCH', 1588.00, 2500.00, 'JG551428', 549, 274, 183, 'JG551428-10 JG551428 ARANDELA  CLUTCH PULSAR 180 UG BAJAJ');
SELECT seed_product(1, 1, 1, 'DP101243-1', 'ARANDELA  CLUTCH PULSAR 200 NS', 'ARANDELA  CLUTCH', 2073.00, 3900.00, 'DP101243', 15, 7, 5, 'DP101243-1 DP101243 ARANDELA  CLUTCH PULSAR 200 NS BAJAJ');
SELECT seed_product(1, 1, 1, '36JL0091-1', 'ARANDELA  CLUTCH PULSAR 200 NS', 'ARANDELA  CLUTCH', 45000.00, 66900.00, '36JL0091', 8, 4, 2, '36JL0091-1 36JL0091 ARANDELA  CLUTCH PULSAR 200 NS BAJAJ');
SELECT seed_product(1, 1, 1, '28101110-1', 'ARANDELA CIGUEÑAL DISCOVER 135', 'ARANDELA CIGUEÑAL', 3361.00, 5000.00, '28101110', 34, 17, 11, '28101110-1 28101110 ARANDELA CIGUEÑAL DISCOVER 135 BAJAJ');
SELECT seed_product(1, 1, 1, 'DU101213-5', 'ARANDELA PIÑON SALIDA BOXER CT', 'ARANDELA PIÑON SALIDA', 756.00, 1400.00, 'DU101213', 55, 27, 18, 'DU101213-5 DU101213 ARANDELA PIÑON SALIDA BOXER CT BAJAJ');
SELECT seed_product(1, 1, 1, 'DE151012-5', 'ARANDELA PULSAR 135', 'ARANDELA', 510.00, 810.00, 'DE151012', 75, 37, 25, 'DE151012-5 DE151012 ARANDELA PULSAR 135 BAJAJ');
SELECT seed_product(1, 1, 1, 'DJ191026-5', 'ARANDELA PULSAR 180 UG', 'ARANDELA', 100.00, 600.00, 'DJ191026', 15, 7, 5, 'DJ191026-5 DJ191026 ARANDELA PULSAR 180 UG BAJAJ');
SELECT seed_product(1, 1, 1, 'DS101084-5', 'ARANDELA PULSAR 180 UG', 'ARANDELA', 260.00, 950.00, 'DS101084', 102, 51, 34, 'DS101084-5 DS101084 ARANDELA PULSAR 180 UG BAJAJ');
SELECT seed_product(1, 1, 1, 'DK101570-1', 'ARANDELA PULSAR 180 UG', 'ARANDELA', 2078.00, 8900.00, 'DK101570', 5, 2, 1, 'DK101570-1 DK101570 ARANDELA PULSAR 180 UG BAJAJ');
SELECT seed_product(1, 1, 1, 'DK101571-1', 'ARANDELA PULSAR 180 UG', 'ARANDELA', 7071.00, 9900.00, 'DK101571', 5, 2, 1, 'DK101571-1 DK101571 ARANDELA PULSAR 180 UG BAJAJ');
SELECT seed_product(1, 1, 1, 'DP101114-1', 'ARANDELA PULSAR 200 NS', 'ARANDELA', 3782.00, 8900.00, 'DP101114', 15, 7, 5, 'DP101114-1 DP101114 ARANDELA PULSAR 200 NS BAJAJ');
SELECT seed_product(1, 1, 1, 'LDA00008-20', 'ARANDELA PULSAR 200 NS', 'ARANDELA', 312.00, 700.00, 'LDA00008', 208, 104, 69, 'LDA00008-20 LDA00008 ARANDELA PULSAR 200 NS BAJAJ');


-- Eliminar la función auxiliar
-- UBICACIONES (estantes): las que usa el stock sembrado + algunas libres para probar la gestión de ubicaciones
INSERT INTO warehouse_locations (company_id, warehouse_id, code, description)
SELECT DISTINCT company_id, warehouse_id, location, 'Estante inicial de la semilla'
FROM stock
WHERE location <> ''
ON CONFLICT (warehouse_id, code) DO NOTHING;

INSERT INTO warehouse_locations (company_id, warehouse_id, code, description) VALUES
    (1, 1, 'ESTANTE-P1-02', 'Principal · pasillo 1, estante 2 (libre)'),
    (1, 1, 'ESTANTE-P1-03', 'Principal · pasillo 1, estante 3 (libre)'),
    (1, 2, 'ESTANTE-ON-03', 'Online · despachos, estante 3 (libre)'),
    (1, 3, 'ESTANTE-NORTE-02', 'Norte · estante 2 (libre)')
ON CONFLICT (warehouse_id, code) DO NOTHING;

DROP FUNCTION IF EXISTS seed_product;

-- 10. MOVIMIENTOS BANCARIOS REALES DEL EXTRACTO (000090139539_20261029_161736.pdf)
INSERT INTO bank_statement_records (
    company_id, bank_name, account_number, movement_date, description,
    branch_channel, reference1, reference2, document_number, amount, is_income, status
)
VALUES
    (1, 'Bancolombia', '01400000369', '2026-10-28', 'PAGO QR VICTOR MANUEL', 'LA PLAYA', '0043545714', NULL, NULL, 446950.00, TRUE, 'pending'),
    (1, 'Bancolombia', '01400000369', '2026-10-28', 'PAGO QR VICTOR AURELI', 'LA PLAYA', '0043545714', NULL, NULL, 420800.00, TRUE, 'pending'),
    (1, 'Bancolombia', '01400000369', '2026-10-28', 'TRANSFERENCIA CTA SUC VIRTUAL', 'LA PLAYA', '10042604794', '10042604794', NULL, 599200.00, TRUE, 'pending'),
    (1, 'Bancolombia', '01400000369', '2026-10-28', 'TRANSFERENCIA CTA SUC VIRTUAL', 'LA PLAYA', '53626328624', '53626328624', NULL, 529000.00, TRUE, 'pending'),
    (1, 'Bancolombia', '01400000369', '2026-10-28', 'TRANSFERENCIA DESDE NEQUI', 'LA PLAYA', 'YENY GOMEZ 4479', NULL, NULL, 300000.00, TRUE, 'pending'),
    (1, 'Bancolombia', '01400000369', '2026-10-28', 'CONSIG LOCAL REFEREN EFECTIVO', 'CNB REDES', '1000758800', '1000758800', NULL, 1000000.00, TRUE, 'pending'),
    (1, 'Bancolombia', '01400000369', '2026-10-28', 'IMPTO GOBIERNO 4X1000', 'LA PLAYA', NULL, NULL, NULL, -114.54, FALSE, 'ignored'),
    (1, 'Bancolombia', '01400000369', '2026-10-28', 'COMISION REC CORRESPONSAL', 'LA PLAYA', NULL, NULL, NULL, -24064.45, FALSE, 'ignored'),
    (1, 'Bancolombia', '01400000369', '2026-10-28', 'IVA COMISION REC CORRESPONSAL', 'LA PLAYA', NULL, NULL, NULL, -4572.25, FALSE, 'ignored');

-- ============================================================================
-- FIN DE SCRIPT DE SEMILLAS
-- ============================================================================


-- 40. TABLA: screensaver_settings (Configuración dinámica del protector de pantalla)


-- SEED DE CONFIGURACIÓN ADICIONAL
UPDATE warehouses SET manager_employee_id = 1 WHERE id = 1;
UPDATE warehouses SET manager_employee_id = 2 WHERE id = 2;

INSERT INTO screensaver_settings (company_id, image_url, is_active)
VALUES (1, '/assets/screensaver-logo-g9yP8ea8.jpg', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO cash_sessions (company_id, warehouse_id, status, opened_by_actor_type, opened_by_actor_id, opened_by_name, opening_amount)
VALUES (1, 1, 'open', 'employee', 1, 'Andrés Felipe Ramos', 150000.00)
ON CONFLICT DO NOTHING;


-- SEED DE VENTAS, PEDIDOS Y OPERACIONES (CAJA, DESPACHOS, CARTERA Y GARANTÍAS)
INSERT INTO sales (
    id, company_id, serial_code, customer_id, employee_id, warehouse_id,
    price_tier, payment_method, payment_condition, immediate_picking,
    status, current_stage, subtotal, discount_total, iva_total, total, paid_total,
    notes, payment_reference
)
OVERRIDING SYSTEM VALUE
VALUES 
    (1, 1, 'PED-0001', 1, 1, 1, 'p1', 'cash', 'cash', TRUE, 'open', 'verification', 120000.00, 0, 0, 120000.00, 120000.00, 'Pedido en mostrador para entrega inmediata', 'EFEC-CAJA-01'),
    (2, 1, 'PED-0002', 2, 1, 1, 'p1', 'transfer', 'cash', FALSE, 'open', 'picking', 250000.00, 0, 0, 250000.00, 0.00, 'Pedido con transferencia bancaria para alistamiento', 'TRANSF-77492'),
    (3, 1, 'PED-0003', 3, 2, 1, 'p1', 'credit', 'credit', FALSE, 'open', 'invoicing', 450000.00, 0, 0, 450000.00, 100000.00, 'Venta a crédito aprobada por cartera', NULL),
    (4, 1, 'PED-0004', 1, 1, 1, 'p1', 'cash', 'cash', FALSE, 'completed', 'sent', 85000.00, 0, 0, 85000.00, 85000.00, 'Venta anterior entregada y facturada', 'EFEC-HIST-01')
ON CONFLICT (id) DO NOTHING;

-- la parte a crédito de los pedidos a crédito y la primera fila del historial de etapas de cada pedido
UPDATE sales SET credit_amount = total - paid_total WHERE payment_method = 'credit';
INSERT INTO sale_stage_history (sale_id, stage, entered_at)
SELECT s.id, s.current_stage, s.created_at FROM sales s
WHERE NOT EXISTS (SELECT 1 FROM sale_stage_history h WHERE h.sale_id = s.id);

INSERT INTO sale_items (
    id, sale_id, product_id, stock_id, product_code, product_name,
    price_tier, quantity, picked_qty, packed_qty, dispatched_qty,
    unit_price, subtotal, line_total, process_stage, stage_status
)
OVERRIDING SYSTEM VALUE
VALUES
    (1, 1, 1, 1, 'CIL-P100', 'Cilindro Estándar DT125', 'p1', 1, 0, 0, 0, 120000.00, 120000.00, 120000.00, 'verification', 'pending'),
    (2, 2, 2, 2, 'LUB-4T', 'Aceite Sintético 4T 20W50', 'p1', 5, 5, 0, 0, 50000.00, 250000.00, 250000.00, 'picking', 'in_progress'),
    (3, 3, 3, 3, 'FRN-DISC', 'Disco Delantero NMAX', 'p1', 3, 3, 3, 0, 150000.00, 450000.00, 450000.00, 'invoicing', 'in_progress'),
    (4, 4, 1, 1, 'CIL-P100', 'Cilindro Estándar DT125', 'p1', 1, 1, 1, 1, 85000.00, 85000.00, 85000.00, 'sent', 'completed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO payments (
    id, company_id, serial_code, sale_id, customer_id, employee_id,
    method, amount, status, reference, cash_session_id
)
OVERRIDING SYSTEM VALUE
VALUES
    (1, 1, 'PAG-0001', 1, 1, 1, 'cash', 120000.00, 'verified', 'EFEC-CAJA-01', 1),
    (2, 1, 'PAG-0002', 2, 2, 1, 'transfer', 250000.00, 'review', 'TRANSF-77492', 1),
    (3, 1, 'REC-1001', 3, 3, 1, 'cash', 100000.00, 'verified', 'ABONO-01', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO returns (
    id, company_id, sale_id, customer_id, employee_id,
    reason, reason_type, resolution_type, status, total
)
OVERRIDING SYSTEM VALUE
VALUES
    (1, 1, 4, 1, 1, 'Ralladura en empaque original detectada al recibir', 'warranty', 'credit_balance', 'approved', 85000.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO return_items (
    id, return_id, sale_item_id, quantity, restock
)
OVERRIDING SYSTEM VALUE
VALUES
    (1, 1, 4, 1, TRUE)
ON CONFLICT (id) DO NOTHING;

-- AJUSTE DE SECUENCIAS IDENTITY PARA QUE LOS PRÓXIMOS REGISTROS NO GENEREN CONFLICTO
SELECT setval(pg_get_serial_sequence('sales', 'id'), COALESCE((SELECT MAX(id) FROM sales), 1));
SELECT setval(pg_get_serial_sequence('sale_items', 'id'), COALESCE((SELECT MAX(id) FROM sale_items), 1));
SELECT setval(pg_get_serial_sequence('payments', 'id'), COALESCE((SELECT MAX(id) FROM payments), 1));
SELECT setval(pg_get_serial_sequence('returns', 'id'), COALESCE((SELECT MAX(id) FROM returns), 1));
SELECT setval(pg_get_serial_sequence('return_items', 'id'), COALESCE((SELECT MAX(id) FROM return_items), 1));
SELECT setval(pg_get_serial_sequence('cash_sessions', 'id'), COALESCE((SELECT MAX(id) FROM cash_sessions), 1));
SELECT setval(pg_get_serial_sequence('externals', 'id'), COALESCE((SELECT MAX(id) FROM externals), 1));
SELECT setval(pg_get_serial_sequence('screensaver_settings', 'id'), COALESCE((SELECT MAX(id) FROM screensaver_settings), 1));

-- SEED DE OPERACIÓN (migración 014): datos de ejemplo para recorrer todas las pantallas
-- 1) Modelos de moto y su ligadura a los productos que aún no tienen modelo
INSERT INTO models (company_id, name, description)
SELECT 1, v.name, v.description FROM (VALUES
    ('Boxer CT 100', 'Bajaj Boxer CT 100'),
    ('Pulsar NS 200', 'Bajaj Pulsar NS 200'),
    ('FZ 16', 'Yamaha FZ 16'),
    ('CB 125', 'Honda CB 125'),
    ('XTZ 125', 'Yamaha XTZ 125'),
    ('Discover 125', 'Bajaj Discover 125')
) AS v(name, description)
WHERE NOT EXISTS (SELECT 1 FROM models m WHERE m.company_id = 1 AND m.name = v.name);

UPDATE products p SET model_id = m.id
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY id) % 6 AS k FROM products WHERE model_id IS NULL) x
JOIN (SELECT id, ROW_NUMBER() OVER (ORDER BY id) - 1 AS k FROM models WHERE company_id = 1) m ON m.k = x.k
WHERE p.id = x.id;

-- 2) Facturación por bodega (sin esto no se puede facturar) y series de consecutivos
INSERT INTO warehouse_facturation (company_id, warehouse_id, type_facturation, document_type, nit, legal_name, trade_name, billing_email, billing_phone, billing_address, billing_city, invoice_prefix, resolution_number, resolution_date, range_from, range_to)
SELECT w.company_id, w.id, 'juridica', 'NIT', '900111222-1', 'IMPORTADORA PREMIUM S.A.S.', w.name, 'facturacion@importadora.com', '3000000000', COALESCE(w.address, 'Sin dirección'), COALESCE(w.city, 'Cali'), 'FE', '18760000' || LPAD(w.id::text, 4, '0'), DATE '2026-01-15', 1, 5000
FROM warehouses w
WHERE NOT EXISTS (SELECT 1 FROM warehouse_facturation f WHERE f.warehouse_id = w.id);

INSERT INTO doc_series (company_id, warehouse_id, doc_type, prefix, next_number)
SELECT w.company_id, w.id, d.doc_type, d.prefix, d.next_number
FROM warehouses w
CROSS JOIN (VALUES ('sale', 'PED-', 5), ('transfer', 'TR-', 3), ('quotation', 'COT-', 4), ('purchase', 'OC-', 3), ('payment', 'PAG-', 4), ('invoice', 'FE-', 2)) AS d(doc_type, prefix, next_number)
WHERE NOT EXISTS (SELECT 1 FROM doc_series s WHERE s.company_id = w.company_id AND COALESCE(s.warehouse_id, 0) = w.id AND s.doc_type = d.doc_type);

-- 3) Cotizaciones: borrador, enviada y aceptada, con dos productos cada una
INSERT INTO quotations (company_id, serial_code, customer_id, employee_id, status, valid_until, notes)
SELECT 1, v.serial, v.customer_id, 1, v.status, CURRENT_DATE + v.days, v.notes FROM (VALUES
    ('COT-SEED-01', 1, 'draft', 15, 'Borrador para el cliente de mostrador'),
    ('COT-SEED-02', 2, 'sent', 10, 'Enviada por correo, espera respuesta'),
    ('COT-SEED-03', 3, 'accepted', 5, 'Aceptada: pendiente de convertir en pedido')
) AS v(serial, customer_id, status, days, notes)
WHERE NOT EXISTS (SELECT 1 FROM quotations q WHERE q.company_id = 1 AND q.serial_code = v.serial);

INSERT INTO quotation_items (quotation_id, product_id, quantity, unit_price, discount, iva_percent, line_total)
SELECT q.id, p.id, 2 + (p.n % 3), 40000 + p.n * 5000, 0, 19, (2 + (p.n % 3)) * (40000 + p.n * 5000)
FROM quotations q
JOIN (SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS n FROM products WHERE company_id = 1) p ON p.n IN (
    CASE q.serial_code WHEN 'COT-SEED-01' THEN 1 WHEN 'COT-SEED-02' THEN 3 ELSE 5 END,
    CASE q.serial_code WHEN 'COT-SEED-01' THEN 2 WHEN 'COT-SEED-02' THEN 4 ELSE 6 END)
WHERE q.serial_code LIKE 'COT-SEED-%' AND NOT EXISTS (SELECT 1 FROM quotation_items i WHERE i.quotation_id = q.id);

UPDATE quotations q SET
    subtotal = t.total,
    total = t.total,
    updated_at = CURRENT_TIMESTAMP
FROM (SELECT quotation_id, SUM(line_total) AS total FROM quotation_items GROUP BY quotation_id) t
WHERE t.quotation_id = q.id AND q.serial_code LIKE 'COT-SEED-%' AND q.total = 0;

-- 4) Traslados: uno pendiente (bodega 1 a 2) y uno en tránsito (bodega 3 a 1)
INSERT INTO transfers (company_id, serial_code, transfer_type, origin_warehouse_id, destination_warehouse_id, employee_id, status, priority, notes, dispatched_at, dispatched_by_employee_id)
SELECT 1, v.serial, 'standard', v.origin, v.destination, 1, v.status, v.priority, v.notes, v.dispatched_at, v.dispatched_by
FROM (VALUES
    ('TR-SEED-01', 1, 2, 'pending', 'normal', 'Reposición de la tienda online', NULL::timestamptz, NULL::bigint),
    ('TR-SEED-02', 3, 1, 'in_transit', 'high', 'Surtido urgente para el mostrador', NOW() - INTERVAL '3 hours', 2::bigint)
) AS v(serial, origin, destination, status, priority, notes, dispatched_at, dispatched_by)
WHERE NOT EXISTS (SELECT 1 FROM transfers t WHERE t.company_id = 1 AND t.serial_code = v.serial);

INSERT INTO details_transfer (transfer_id, product_id, origin_stock_id, product_code, product_name, destination_location, quantity)
SELECT t.id, s.product_id, s.id, p.code, p.name,
       CASE t.serial_code WHEN 'TR-SEED-01' THEN 'ESTANTE-ON-02' ELSE 'ESTANTE-P1-01' END,
       1 + (s.n % 2)
FROM transfers t
JOIN (SELECT id, product_id, warehouse_id, ROW_NUMBER() OVER (PARTITION BY warehouse_id ORDER BY id) AS n FROM stock WHERE available >= 2) s
  ON s.warehouse_id = t.origin_warehouse_id AND s.n <= 2
JOIN products p ON p.id = s.product_id
WHERE t.serial_code LIKE 'TR-SEED-%' AND NOT EXISTS (SELECT 1 FROM details_transfer d WHERE d.transfer_id = t.id);

-- 5) Compras: una pedida al proveedor y una ya recibida
INSERT INTO purchases (company_id, serial_code, supplier_id, warehouse_id, employee_id, status, supplier_ref, expected_date, notes, received_at)
SELECT 1, v.serial, v.supplier_id, v.warehouse_id, 1, v.status, v.ref, CURRENT_DATE + v.days, v.notes, v.received_at
FROM (VALUES
    ('OC-SEED-01', 10, 1, 'ordered', 'FAC-PROV-1001', 7, 'Pedido semanal de repuestos Bajaj', NULL::timestamptz),
    ('OC-SEED-02', 11, 3, 'received', 'FAC-PROV-0990', -3, 'Compra ya recibida en la bodega norte', NOW() - INTERVAL '2 days')
) AS v(serial, supplier_id, warehouse_id, status, ref, days, notes, received_at)
WHERE NOT EXISTS (SELECT 1 FROM purchases p WHERE p.company_id = 1 AND p.serial_code = v.serial);

INSERT INTO purchase_items (purchase_id, product_id, quantity, received_qty, unit_cost, iva_percent, subtotal)
SELECT pu.id, p.id, 10 + p.n, CASE pu.status WHEN 'received' THEN 10 + p.n ELSE 0 END, 18000 + p.n * 1000, 19, (10 + p.n) * (18000 + p.n * 1000)
FROM purchases pu
JOIN (SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS n FROM products WHERE company_id = 1) p ON p.n <= 3
WHERE pu.serial_code LIKE 'OC-SEED-%' AND NOT EXISTS (SELECT 1 FROM purchase_items i WHERE i.purchase_id = pu.id);

UPDATE purchases pu SET subtotal = t.total, total = ROUND(t.total * 1.19, 2), updated_at = CURRENT_TIMESTAMP
FROM (SELECT purchase_id, SUM(subtotal) AS total FROM purchase_items GROUP BY purchase_id) t
WHERE t.purchase_id = pu.id AND pu.serial_code LIKE 'OC-SEED-%' AND pu.total = 0;

-- 6) Una factura emitida del pedido ya enviado (PED-0004)
INSERT INTO invoices (company_id, warehouse_id, warehouse_facturation_id, sale_id, employee_id, kind, number, status)
SELECT s.company_id, s.warehouse_id, f.id, s.id, 1, 'invoice', 'FE-000001', 'issued'
FROM sales s
JOIN warehouse_facturation f ON f.warehouse_id = s.warehouse_id
WHERE s.serial_code = 'PED-0004' AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.sale_id = s.id AND i.kind = 'invoice');

-- 7) Notificaciones del empleado 1 (una ya leída)
INSERT INTO notifications (employee_id, kind, title, body, entity, entity_id, read_at)
SELECT 1, v.kind, v.title, v.body, v.entity, NULL, v.read_at FROM (VALUES
    ('info', 'Traslado en camino', 'El traslado TR-SEED-02 salió de la bodega norte hacia Paseo Bolívar.', 'transfers', NULL::timestamptz),
    ('warning', 'Cupo de crédito alto', 'Un cliente superó el 75 % de su cupo de crédito.', 'customers', NULL::timestamptz),
    ('success', 'Pago verificado', 'Se verificó el pago PAG-0001.', 'payments', NOW() - INTERVAL '1 day'),
    ('error', 'Stock agotado', 'Un producto de la bodega online quedó sin unidades vendibles.', 'stock', NULL::timestamptz)
) AS v(kind, title, body, entity, read_at)
WHERE NOT EXISTS (SELECT 1 FROM notifications n WHERE n.employee_id = 1 AND n.title = v.title);

-- 8) Documentos de clientes (para el control de vencimientos)
INSERT INTO customer_documents (customer_id, doc_type, file_name, file_url, mime_type, notes)
SELECT v.customer_id, v.doc_type, v.file_name, v.file_url, 'application/pdf', v.notes FROM (VALUES
    (3, 'rut', 'rut-cliente-3.pdf', '/assets/demo/rut-cliente-3.pdf', 'RUT actualizado'),
    (3, 'credit_form', 'formulario-credito-3.pdf', '/assets/demo/formulario-credito-3.pdf', 'Solicitud de crédito firmada'),
    (4, 'chamber', 'camara-comercio-4.pdf', '/assets/demo/camara-comercio-4.pdf', 'Cámara de comercio vigente')
) AS v(customer_id, doc_type, file_name, file_url, notes)
WHERE NOT EXISTS (SELECT 1 FROM customer_documents d WHERE d.customer_id = v.customer_id AND d.doc_type = v.doc_type);

-- 9) Un conteo físico pendiente en la bodega 1 con tres ubicaciones (una ya contada)
INSERT INTO counts (company_id, warehouse_id, employee_id, status, notes)
SELECT 1, 1, 1, 'pending', 'Conteo de prueba SEED'
WHERE NOT EXISTS (SELECT 1 FROM counts WHERE notes = 'Conteo de prueba SEED');

INSERT INTO count_items (count_id, stock_id, employee_id, expected_qty, counted_qty)
SELECT c.id, s.id, 1, s.available, CASE WHEN s.n = 1 THEN s.available ELSE NULL END
FROM counts c
JOIN (SELECT id, available, ROW_NUMBER() OVER (ORDER BY id) AS n FROM stock WHERE warehouse_id = 1) s ON s.n <= 3
WHERE c.notes = 'Conteo de prueba SEED' AND NOT EXISTS (SELECT 1 FROM count_items i WHERE i.count_id = c.id);

-- 10) Movimientos de kardex de ejemplo en la bodega 1
INSERT INTO audit_movements (company_id, stock_id, employee_id, movement_type, quantity, previous_qty, new_qty, reference_type, reference_id, reason)
SELECT 1, s.id, 1, v.type, v.qty, s.available - v.qty, s.available, v.ref_type, NULL, v.reason
FROM (SELECT id, available, ROW_NUMBER() OVER (ORDER BY id) AS n FROM stock WHERE warehouse_id = 1) s
JOIN (VALUES
    (1, 'purchase_in', 12, 'purchases', 'Entrada de compra de ejemplo'),
    (2, 'sale_out', -3, 'sales', 'Salida por venta de ejemplo'),
    (3, 'transfer_in', 4, 'transfers', 'Entrada por traslado de ejemplo'),
    (4, 'adjustment', 2, NULL, 'Ajuste de inventario de ejemplo'),
    (5, 'return_in', 1, 'returns', 'Devolución de cliente de ejemplo')
) AS v(n, type, qty, ref_type, reason) ON v.n = s.n
WHERE s.available - v.qty >= 0 AND NOT EXISTS (SELECT 1 FROM audit_movements m WHERE m.stock_id = s.id AND m.reason = v.reason);

-- SEED COMPLETO DE OPERACIÓN (migración 015)
-- Migración 015: semilla completa para probar toda la operación (clientes, ubicaciones, stock repartido, pedidos en cada etapa,
-- pagos, cartera, banco, cajas, auditoría, papelera y carrito) en las tres bodegas.
-- Es repetible: cada bloque revisa si ya existe antes de insertar. Los pedidos y todo lo que cuelga de ellos van en un solo bloque DO
-- que se salta si ya existe el pedido PED-S15-01.
-- Requiere la semilla base y la 014 (empleados, productos con stock, ubicaciones, cajas, clientes 1 a 4).

-- 0) La semilla base inserta con id fijo; se adelantan las secuencias de las tablas que usa esta migración para que los nuevos ids no choquen
DO $seq$
DECLARE
    t text;
    seq text;
BEGIN
    FOREACH t IN ARRAY ARRAY['customers', 'warehouse_locations', 'stock', 'cash_sessions', 'sales', 'sale_items', 'sale_stage_history', 'payments',
                             'credit_entries', 'bank_statement_records', 'audit_logs', 'recycle_bin', 'carts', 'cart_items', 'brands']
    LOOP
        seq := pg_get_serial_sequence(t, 'id');
        EXECUTE format('SELECT setval(%L, GREATEST((SELECT COALESCE(MAX(id), 0) FROM %I), (SELECT last_value FROM %s)))', seq, t, seq);
    END LOOP;
END
$seq$;

-- 1) Clientes: natural y jurídica, con y sin crédito, con descuento, varias direcciones y todos los estados
INSERT INTO customers (company_id, document_type, document, person_type, name, last_name, trade_name, email, phone, mobile, address, city,
                       vat_responsible, addresses, price_tier, discount_percent, credit_enabled, credit_limit, credit_days, status)
SELECT 1, v.document_type, v.document, v.person_type, v.name, v.last_name, v.trade_name, v.email, v.phone, v.mobile, v.address, v.city,
       v.vat_responsible, v.addresses::jsonb, v.price_tier, v.discount_percent, v.credit_enabled, v.credit_limit, v.credit_days, v.status
FROM (VALUES
    ('CC', '1010101010', 'natural', 'Carlos Andrés', 'Mejía', NULL, 'carlos.mejia@correo.com', '6025551010', '3101010101', 'Cra 5 # 10-20', 'Cali',
     FALSE, '[{"address":"Cra 5 # 10-20","neighborhood":"San Fernando","city":"Cali","department":"Valle del Cauca","country":"Colombia"},{"address":"Calle 9 # 33-14","neighborhood":"Tequendama","city":"Cali","department":"Valle del Cauca","country":"Colombia","additionalInfo":"Entregar en portería"}]',
     'p1', 5.00, FALSE, 0, 0, 'active'),
    ('CC', '52123456', 'natural', 'Luz Marina', 'Cárdenas', NULL, 'luz.cardenas@correo.com', NULL, '3112223344', 'Calle 70 # 4-12', 'Palmira',
     FALSE, '[{"address":"Calle 70 # 4-12","neighborhood":"Centro","city":"Palmira","department":"Valle del Cauca","country":"Colombia"}]',
     'p1', 0.00, TRUE, 1500000, 30, 'active'),
    ('NIT', '900123456-7', 'legal', 'AUTOPARTES EL PROGRESO SAS', NULL, 'El Progreso Autopartes', 'compras@elprogreso.com', '6023334455', '3203334455', 'Av 3N # 45-10', 'Cali',
     TRUE, '[{"address":"Av 3N # 45-10","neighborhood":"Versalles","city":"Cali","department":"Valle del Cauca","country":"Colombia"},{"address":"Zona Industrial Calle 15 # 28-30","neighborhood":"Acopi","city":"Yumbo","department":"Valle del Cauca","country":"Colombia"},{"address":"Cra 100 # 14-60","neighborhood":"Pance","city":"Cali","department":"Valle del Cauca","country":"Colombia"}]',
     'p2', 8.00, TRUE, 8000000, 45, 'active'),
    ('NIT', '800987654-1', 'legal', 'MOTOCICLETAS DEL VALLE LTDA', NULL, 'Motovalle', 'cartera@motovalle.com', '6027778899', '3157778899', 'Cra 8 # 20-31', 'Tuluá',
     TRUE, '[{"address":"Cra 8 # 20-31","neighborhood":"Centro","city":"Tuluá","department":"Valle del Cauca","country":"Colombia"}]',
     'p3', 3.00, TRUE, 4000000, 30, 'overdue'),
    ('CC', '16789012', 'natural', 'Hernán', 'Ortiz', NULL, 'hernan.ortiz@correo.com', NULL, '3009998877', 'Calle 5 # 23-40', 'Buga',
     FALSE, '[]', 'p1', 0.00, TRUE, 500000, 15, 'inactive'),
    ('NIT', '901555777-3', 'legal', 'TALLER MOTOS EXPRESS SAS', NULL, 'Motos Express', 'taller@motosexpress.com', NULL, '3185556677', 'Cra 15 # 30-05', 'Cali',
     TRUE, '[{"address":"Cra 15 # 30-05","neighborhood":"Alfonso López","city":"Cali","department":"Valle del Cauca","country":"Colombia"}]',
     'p2', 10.00, TRUE, 2500000, 15, 'active'),
    ('CE', '300456789', 'natural', 'Jean Pierre', 'Dubois', NULL, 'jp.dubois@correo.com', NULL, '3201112233', 'Calle 10 # 5-80', 'Cartagena',
     FALSE, '[{"address":"Calle 10 # 5-80","neighborhood":"Getsemaní","city":"Cartagena","department":"Bolívar","country":"Colombia"}]',
     'p1', 0.00, FALSE, 0, 0, 'active'),
    ('PA', 'PA123456', 'natural', 'Ana', 'Rojas', NULL, 'ana.rojas@correo.com', NULL, '3004445566', NULL, 'Medellín',
     FALSE, '[]', 'p1', 0.00, FALSE, 0, 0, 'pending')
) AS v(document_type, document, person_type, name, last_name, trade_name, email, phone, mobile, address, city,
       vat_responsible, addresses, price_tier, discount_percent, credit_enabled, credit_limit, credit_days, status)
WHERE NOT EXISTS (SELECT 1 FROM customers c WHERE c.company_id = 1 AND c.document = v.document);

-- 2) Ubicaciones: más por bodega, una inactiva en cada una
INSERT INTO warehouse_locations (company_id, warehouse_id, code, description, is_active)
SELECT 1, v.warehouse_id, v.code, v.description, v.is_active FROM (VALUES
    (1, 'ESTANTE-P2-01', 'Segundo piso, pasillo 1', TRUE),
    (1, 'ESTANTE-P2-02', 'Segundo piso, pasillo 2', TRUE),
    (1, 'VITRINA-01', 'Vitrina de mostrador', TRUE),
    (1, 'ESTANTE-OLD-01', 'Estante en desuso', FALSE),
    (2, 'ESTANTE-ON-01', 'Zona de despacho online', TRUE),
    (2, 'ESTANTE-ON-04', 'Empaque online', TRUE),
    (2, 'ESTANTE-ON-OLD', 'Estante en desuso', FALSE),
    (3, 'ESTANTE-NORTE-03', 'Mercancía de rotación media', TRUE),
    (3, 'ESTANTE-NORTE-04', 'Mercancía de rotación baja', TRUE),
    (3, 'ESTANTE-NORTE-OLD', 'Estante en desuso', FALSE)
) AS v(warehouse_id, code, description, is_active)
WHERE NOT EXISTS (SELECT 1 FROM warehouse_locations l WHERE l.warehouse_id = v.warehouse_id AND l.code = v.code);

-- 3) Stock repartido: algunos productos pasan la mitad a una segunda ubicación de la misma bodega (la fila nueva solo se crea si no existía)
WITH src AS (
    SELECT s.id, s.company_id, s.product_id, s.warehouse_id, s.min_stock, s.max_stock, s.available / 2 AS moved,
           CASE s.warehouse_id WHEN 1 THEN 'ESTANTE-P1-02' WHEN 2 THEN 'ESTANTE-ON-03' ELSE 'ESTANTE-NORTE-02' END AS dest
    FROM stock s
    WHERE s.product_id >= 20 AND s.product_id % 3 = 0 AND s.available >= 4 AND s.reserved = 0
),
ins AS (
    INSERT INTO stock (company_id, product_id, warehouse_id, location, available, reserved, min_stock, max_stock)
    SELECT company_id, product_id, warehouse_id, dest, moved, 0, min_stock, max_stock FROM src
    ON CONFLICT (product_id, warehouse_id, location) DO NOTHING
    RETURNING product_id, warehouse_id, available
)
UPDATE stock s SET available = s.available - i.available
FROM ins i
WHERE s.product_id = i.product_id AND s.warehouse_id = i.warehouse_id AND s.id IN (SELECT id FROM src);

-- otro grupo se reparte hacia una tercera y cuarta ubicación de cada bodega (por paridad del id del producto)
WITH src AS (
    SELECT s.id, s.company_id, s.product_id, s.warehouse_id, s.min_stock, s.max_stock, s.available / 2 AS moved,
           CASE WHEN s.product_id % 2 = 0
                THEN CASE s.warehouse_id WHEN 1 THEN 'ESTANTE-P2-01' WHEN 2 THEN 'ESTANTE-ON-01' ELSE 'ESTANTE-NORTE-03' END
                ELSE CASE s.warehouse_id WHEN 1 THEN 'VITRINA-01' WHEN 2 THEN 'ESTANTE-ON-04' ELSE 'ESTANTE-NORTE-04' END END AS dest
    FROM stock s
    WHERE s.product_id >= 20 AND s.product_id % 3 = 1 AND s.available >= 4 AND s.reserved = 0
),
ins AS (
    INSERT INTO stock (company_id, product_id, warehouse_id, location, available, reserved, min_stock, max_stock)
    SELECT company_id, product_id, warehouse_id, dest, moved, 0, min_stock, max_stock FROM src
    ON CONFLICT (product_id, warehouse_id, location) DO NOTHING
    RETURNING product_id, warehouse_id, available
)
UPDATE stock s SET available = s.available - i.available
FROM ins i
WHERE s.product_id = i.product_id AND s.warehouse_id = i.warehouse_id AND s.id IN (SELECT id FROM src);

-- agotados y por debajo del mínimo (solo productos que no se reparten ni se usan en los pedidos de abajo)
UPDATE stock SET available = 0 WHERE product_id >= 20 AND product_id % 11 = 0 AND product_id % 3 <> 0 AND reserved = 0;
UPDATE stock SET available = LEAST(available, 3), min_stock = GREATEST(min_stock, 5)
WHERE product_id >= 20 AND product_id % 7 = 0 AND product_id % 3 <> 0 AND product_id % 11 <> 0 AND reserved = 0;

-- 4) Cajas: abierta en la bodega 2, y turnos cerrados en las bodegas 1 y 3
INSERT INTO cash_sessions (company_id, warehouse_id, status, opened_by_actor_type, opened_by_actor_id, opened_by_name, opened_at, opening_amount, notes)
SELECT 1, 2, 'open', 'employee', e.id, e.first_name || ' ' || COALESCE(e.last_name, ''), CURRENT_TIMESTAMP - INTERVAL '3 hours', 200000.00, 'SEED15 caja abierta de la tienda online'
FROM employees e
WHERE e.id = 10 AND NOT EXISTS (SELECT 1 FROM cash_sessions WHERE notes LIKE 'SEED15 caja abierta%');

INSERT INTO cash_sessions (company_id, warehouse_id, status, opened_by_actor_type, opened_by_actor_id, opened_by_name, opened_at,
                           closed_by_actor_type, closed_by_actor_id, closed_by_name, closed_at, opening_amount, cash_total, transfer_total, payments_count,
                           expected_cash, counted_cash, difference, notes)
SELECT 1, v.warehouse_id, 'closed', 'employee', e.id, e.first_name || ' ' || COALESCE(e.last_name, ''), CURRENT_TIMESTAMP - v.days * INTERVAL '1 day' - INTERVAL '9 hours',
       'employee', e.id, e.first_name || ' ' || COALESCE(e.last_name, ''), CURRENT_TIMESTAMP - v.days * INTERVAL '1 day',
       100000.00, v.cash_total, v.transfer_total, v.payments_count, 100000.00 + v.cash_total, 100000.00 + v.cash_total + v.difference, v.difference, v.note
FROM (VALUES
    (1, 9, 2, 480000.00, 150000.00, 6, 0.00, 'SEED15 turno cerrado sin descuadre'),
    (3, 2, 1, 320000.00, 0.00, 3, -5000.00, 'SEED15 turno cerrado con faltante de 5.000')
) AS v(warehouse_id, employee_id, days, cash_total, transfer_total, payments_count, difference, note)
JOIN employees e ON e.id = v.employee_id
WHERE NOT EXISTS (SELECT 1 FROM cash_sessions WHERE notes = v.note);

-- 5) Pedidos de las tres bodegas en todas las etapas, con sus renglones, historial, pagos, cartera y movimientos de banco (un solo bloque)
DO $seed15$
BEGIN
    IF EXISTS (SELECT 1 FROM sales WHERE company_id = 1 AND serial_code = 'PED-S15-01') THEN
        RETURN;
    END IF;

    -- cada fila: número, bodega, documento del cliente, vendedor, método, condición, picking inmediato, estado, etapa, % pagado, tipo de pago, días de antigüedad
    CREATE TEMP TABLE s15_cases ON COMMIT DROP AS
    SELECT * FROM (VALUES
        (1,  2, '1010101010',  4, 'cash',     'cash',   FALSE, 'open',      'verification',    0, 'cash',     0),
        (2,  2, '52123456',    4, 'cash',     'cash',   TRUE,  'open',      'verification_ok', 100, 'cash',    0),
        (3,  2, '1010101010',  4, 'transfer', 'cash',   FALSE, 'open',      'verification',    0, 'transfer', 1),
        (4,  2, '901555777-3', 4, 'transfer', 'cash',   FALSE, 'open',      'picking',         100, 'transfer', 2),
        (5,  2, '900123456-7', 4, 'cash',     'cash',   FALSE, 'open',      'picking_ok',      50, 'mixed',   2),
        (6,  2, '900123456-7', 4, 'credit',   'credit', FALSE, 'open',      'packing',         0, 'credit',   3),
        (7,  2, '52123456',    4, 'credit',   'credit', FALSE, 'open',      'packing_ok',      0, 'credit',   3),
        (8,  2, '901555777-3', 4, 'credit',   'credit', FALSE, 'open',      'invoicing',       30, 'credit',  5),
        (9,  2, '300456789',   4, 'cash',     'cash',   TRUE,  'completed', 'sent',            100, 'cash',   6),
        (10, 3, '900123456-7', 2, 'credit',   'credit', FALSE, 'open',      'verification_ok', 0, 'credit',   1),
        (11, 3, '901555777-3', 2, 'transfer', 'cash',   FALSE, 'open',      'invoicing_ok',    100, 'transfer', 4),
        (12, 3, '1010101010',  2, 'cash',     'cash',   FALSE, 'open',      'dispatch',        100, 'cash',   4),
        (13, 3, '52123456',    2, 'cash',     'cash',   FALSE, 'cancelled', 'cancelled',       0, 'cash',     7),
        (14, 3, '300456789',   2, 'transfer', 'cash',   FALSE, 'completed', 'sent',            100, 'transfer', 10),
        (15, 1, '800987654-1', 3, 'credit',   'credit', FALSE, 'open',      'invoicing_ok',    0, 'credit',   70),
        (16, 1, '800987654-1', 3, 'credit',   'credit', FALSE, 'completed', 'sent',            40, 'credit',  45),
        (17, 1, '1010101010',  3, 'cash',     'cash',   TRUE,  'open',      'packing',         100, 'cash',   0),
        (18, 1, '52123456',    3, 'transfer', 'cash',   FALSE, 'open',      'packing_ok',      0, 'transfer', 1),
        (19, 1, '900123456-7', 3, 'cash',     'cash',   FALSE, 'open',      'dispatch',        100, 'cash',   2),
        (20, 1, '901555777-3', 3, 'credit',   'credit', FALSE, 'completed', 'sent',            100, 'credit', 20)
    ) AS t(n, wh, doc, emp, method, cond, imm, status, stage, paid_pct, kind, age);

    ALTER TABLE s15_cases ADD COLUMN serial TEXT;
    UPDATE s15_cases SET serial = 'PED-S15-' || LPAD(n::text, 2, '0');

    -- productos que se pueden vender en cada bodega: con buen stock y que ningún paso de arriba toca
    CREATE TEMP TABLE s15_pick ON COMMIT DROP AS
    SELECT warehouse_id AS wh, id AS stock_id, product_id, ROW_NUMBER() OVER (PARTITION BY warehouse_id ORDER BY product_id) AS idx,
           COUNT(*) OVER (PARTITION BY warehouse_id) AS total
    FROM stock
    WHERE product_id BETWEEN 20 AND 400 AND product_id % 3 = 2 AND product_id % 7 <> 0 AND product_id % 11 <> 0 AND available >= 20 AND reserved = 0;

    INSERT INTO sales (company_id, serial_code, customer_id, employee_id, warehouse_id, price_tier, payment_method, payment_condition, immediate_picking,
                       status, current_stage, sale_at, due_date, cancel_reason, notes, created_at)
    SELECT 1, c.serial, cu.id, c.emp, c.wh, cu.price_tier, c.method, c.cond, c.imm, c.status, c.stage,
           CASE WHEN c.stage IN ('invoicing', 'invoicing_ok', 'dispatch', 'sent') THEN CURRENT_TIMESTAMP - c.age * INTERVAL '1 day' END,
           CASE WHEN c.method = 'credit' AND c.stage IN ('invoicing', 'invoicing_ok', 'dispatch', 'sent')
                THEN (CURRENT_DATE - c.age + cu.credit_days) END,
           CASE WHEN c.status = 'cancelled' THEN 'El cliente desistió de la compra' END,
           'SEED15 ' || c.kind || ' en ' || c.stage,
           CURRENT_TIMESTAMP - c.age * INTERVAL '1 day'
    FROM s15_cases c
    JOIN customers cu ON cu.company_id = 1 AND cu.document = c.doc;

    -- dos renglones por pedido; el precio sale de la tarifa p1 del producto y el descuento del cliente
    INSERT INTO sale_items (sale_id, product_id, stock_id, product_code, product_name, price_tier, quantity, picked_qty, packed_qty, dispatched_qty,
                            unit_price, discount, subtotal, line_total, process_stage, stage_status)
    SELECT s.id, p.id, k.stock_id, p.code, p.name, s.price_tier, q.qty,
           CASE WHEN r.rank >= 4 THEN q.qty ELSE 0 END,
           CASE WHEN r.rank >= 6 THEN q.qty ELSE 0 END,
           CASE WHEN r.rank >= 10 THEN q.qty ELSE 0 END,
           pr.price,
           ROUND(pr.price * q.qty * cu.discount_percent / 100, 2),
           pr.price * q.qty,
           pr.price * q.qty - ROUND(pr.price * q.qty * cu.discount_percent / 100, 2),
           CASE WHEN s.current_stage = 'cancelled' THEN 'verification' ELSE s.current_stage END,
           CASE WHEN s.current_stage IN ('verification', 'cancelled') THEN 'pending'
                WHEN s.current_stage LIKE '%\_ok' OR s.current_stage = 'sent' THEN 'completed'
                ELSE 'in_progress' END
    FROM s15_cases c
    JOIN sales s ON s.company_id = 1 AND s.serial_code = c.serial
    JOIN customers cu ON cu.id = s.customer_id
    CROSS JOIN LATERAL (VALUES (1, 1 + (c.n % 3)), (2, 2)) AS q(item, qty)
    JOIN s15_pick k ON k.wh = c.wh AND k.idx = ((c.n * 2 + q.item) % (SELECT MAX(total) FROM s15_pick WHERE wh = c.wh)) + 1
    JOIN products p ON p.id = k.product_id
    CROSS JOIN LATERAL (SELECT COALESCE((SELECT pp.price FROM product_prices pp WHERE pp.product_id = p.id AND pp.price_tier = 'p1'), 30000 + (p.id % 10) * 7500)::numeric AS price) pr
    CROSS JOIN LATERAL (SELECT COALESCE(array_position(ARRAY['verification','verification_ok','picking','picking_ok','packing','packing_ok','invoicing','invoicing_ok','dispatch','sent'], s.current_stage::text), 1) AS rank) r;

    -- totales, parte pagada y parte a crédito
    UPDATE sales s SET
        subtotal = t.subtotal,
        discount_total = t.discount,
        total = t.subtotal - t.discount,
        paid_total = ROUND((t.subtotal - t.discount) * c.paid_pct / 100, 2),
        credit_amount = CASE WHEN s.payment_method = 'credit' THEN (t.subtotal - t.discount) - ROUND((t.subtotal - t.discount) * c.paid_pct / 100, 2) ELSE 0 END
    FROM s15_cases c,
         (SELECT sale_id, SUM(subtotal) AS subtotal, SUM(discount) AS discount FROM sale_items GROUP BY sale_id) t
    WHERE s.serial_code = c.serial AND s.company_id = 1 AND t.sale_id = s.id;

    -- una fila por etapa recorrida (la actual queda abierta)
    INSERT INTO sale_stage_history (sale_id, stage, employee_id, entered_at, left_at)
    SELECT s.id, st.stage, s.employee_id,
           s.created_at + (st.pos - 1) * INTERVAL '2 hours',
           CASE WHEN st.stage = s.current_stage THEN NULL ELSE s.created_at + st.pos * INTERVAL '2 hours' - INTERVAL '5 minutes' END
    FROM sales s
    JOIN s15_cases c ON c.serial = s.serial_code
    CROSS JOIN LATERAL unnest(ARRAY['verification','verification_ok','picking','picking_ok','packing','packing_ok','invoicing','invoicing_ok','dispatch','sent']) WITH ORDINALITY AS st(stage, pos)
    WHERE s.company_id = 1 AND st.pos <= COALESCE(array_position(ARRAY['verification','verification_ok','picking','picking_ok','packing','packing_ok','invoicing','invoicing_ok','dispatch','sent'], s.current_stage::text), 1);

    INSERT INTO sale_stage_history (sale_id, stage, employee_id, entered_at)
    SELECT s.id, 'cancelled', s.employee_id, s.created_at + INTERVAL '3 hours'
    FROM sales s WHERE s.company_id = 1 AND s.serial_code LIKE 'PED-S15-%' AND s.current_stage = 'cancelled';

    -- pagos: efectivo verificado en la caja de la bodega, transferencias en revisión o verificadas, el abono a crédito y el cobro anulado del pedido cancelado
    INSERT INTO payments (company_id, serial_code, sale_id, customer_id, employee_id, verified_by_employee_id, method, amount, status, reference, void_reason,
                          verified_at, cash_session_id, created_at)
    SELECT 1, p.serial, s.id, s.customer_id, s.employee_id,
           CASE WHEN p.status = 'verified' THEN CASE s.warehouse_id WHEN 1 THEN 9 WHEN 2 THEN 10 ELSE 2 END END,
           p.method, p.amount, p.status, p.reference, p.void_reason,
           CASE WHEN p.status = 'verified' THEN s.created_at + INTERVAL '1 hour' END,
           CASE WHEN p.method = 'cash' THEN (SELECT cs.id FROM cash_sessions cs WHERE cs.warehouse_id = s.warehouse_id ORDER BY (cs.status = 'open') DESC, cs.id DESC LIMIT 1) END,
           s.created_at + INTERVAL '1 hour'
    FROM sales s
    JOIN s15_cases c ON c.serial = s.serial_code
    CROSS JOIN LATERAL (
        SELECT 'PAG-S15-' || LPAD(c.n::text, 2, '0') || 'A' AS serial, 'cash' AS method, s.paid_total AS amount, 'verified' AS status,
               'EFEC-S15-' || LPAD(c.n::text, 2, '0') AS reference, NULL::text AS void_reason
        WHERE c.kind IN ('cash', 'mixed', 'credit') AND s.paid_total > 0
        UNION ALL
        SELECT 'PAG-S15-' || LPAD(c.n::text, 2, '0') || 'B', 'transfer', CASE WHEN c.kind = 'mixed' THEN s.total - s.paid_total ELSE s.total END,
               CASE WHEN c.paid_pct = 100 AND c.kind = 'transfer' THEN 'verified' ELSE 'review' END,
               'TRF-S15-' || LPAD(c.n::text, 2, '0'), NULL
        WHERE c.kind IN ('transfer', 'mixed')
        UNION ALL
        SELECT 'PAG-S15-' || LPAD(c.n::text, 2, '0') || 'V', 'cash', s.total, 'voided', 'EFEC-S15-' || LPAD(c.n::text, 2, '0'), 'Pedido cancelado: se devolvió el dinero al cliente'
        WHERE c.kind = 'cash' AND s.current_stage = 'cancelled'
    ) p
    WHERE s.company_id = 1;

    -- cartera: el cargo al facturar (primera vez por sale_at) y el abono posterior
    INSERT INTO credit_entries (company_id, customer_id, employee_id, entry_type, amount, sale_id, reason, created_at)
    SELECT 1, s.customer_id, s.employee_id, 'charge', -s.total, s.id, 'Venta a crédito ' || s.serial_code, s.sale_at
    FROM sales s
    WHERE s.company_id = 1 AND s.serial_code LIKE 'PED-S15-%' AND s.payment_method = 'credit' AND s.sale_at IS NOT NULL;

    INSERT INTO credit_entries (company_id, customer_id, employee_id, entry_type, amount, sale_id, payment_id, reason, created_at)
    SELECT 1, s.customer_id, s.employee_id, 'payment', p.amount, s.id, p.id, 'Abono al pedido ' || s.serial_code, s.sale_at + INTERVAL '1 day'
    FROM sales s
    JOIN payments p ON p.sale_id = s.id AND p.status = 'verified'
    WHERE s.company_id = 1 AND s.serial_code LIKE 'PED-S15-%' AND s.payment_method = 'credit' AND s.sale_at IS NOT NULL;

    -- banco: cada transferencia tiene su movimiento (confirmado si el pago está verificado, pendiente si sigue en revisión) y quedan sueltos otros dos
    INSERT INTO bank_statement_records (company_id, bank_name, account_number, movement_date, description, branch_channel, reference1, document_number, amount, is_income,
                                        status, confirmed_by_id, confirmed_at, notes)
    SELECT 1, 'Bancolombia', '123-456789-00', CURRENT_DATE - 1, 'TRANSFERENCIA ' || p.reference, 'APP MOVIL', p.reference, p.serial_code, p.amount, TRUE,
           CASE WHEN p.status = 'verified' THEN 'confirmed' ELSE 'pending' END,
           CASE WHEN p.status = 'verified' THEN p.verified_by_employee_id END,
           CASE WHEN p.status = 'verified' THEN p.verified_at END,
           'SEED15'
    FROM payments p
    WHERE p.company_id = 1 AND p.serial_code LIKE 'PAG-S15-%' AND p.method = 'transfer';

    INSERT INTO bank_statement_records (company_id, bank_name, account_number, movement_date, description, branch_channel, reference1, amount, is_income, status, notes)
    VALUES
        (1, 'Bancolombia', '123-456789-00', CURRENT_DATE - 2, 'CONSIGNACION SIN PEDIDO', 'SUCURSAL', 'CONS-S15-01', 175000.00, TRUE, 'pending', 'SEED15 entrada sin pedido'),
        (1, 'Bancolombia', '123-456789-00', CURRENT_DATE - 3, 'PAGO PROVEEDOR TRANSPORTES', 'PSE', 'PSE-S15-01', 420000.00, FALSE, 'ignored', 'SEED15 salida, no se concilia');

    -- el stock refleja los pedidos: los abiertos reservan, los enviados descuentan
    UPDATE stock st SET reserved = st.reserved + a.qty
    FROM (SELECT si.stock_id, SUM(si.quantity) AS qty FROM sale_items si JOIN sales s ON s.id = si.sale_id
          WHERE s.serial_code LIKE 'PED-S15-%' AND s.status = 'open' GROUP BY si.stock_id) a
    WHERE st.id = a.stock_id;

    UPDATE stock st SET available = st.available - a.qty
    FROM (SELECT si.stock_id, SUM(si.quantity) AS qty FROM sale_items si JOIN sales s ON s.id = si.sale_id
          WHERE s.serial_code LIKE 'PED-S15-%' AND s.current_stage = 'sent' GROUP BY si.stock_id) a
    WHERE st.id = a.stock_id;
END
$seed15$;

-- 6) Auditoría: acciones recientes de varios usuarios sobre distintas entidades
INSERT INTO audit_logs (company_id, employee_id, entity, entity_id, action, reason, changes, ip_address, created_at)
SELECT 1, v.employee_id, v.entity, v.entity_id, v.action, v.reason, v.changes::jsonb, '190.85.12.40', CURRENT_TIMESTAMP - v.hours * INTERVAL '1 hour'
FROM (VALUES
    (1, 'customers', 6, 'create', 'Alta de cliente jurídico', '{"name":"TALLER MOTOS EXPRESS SAS"}', 70),
    (7, 'customers', 4, 'update', 'Cupo de crédito ajustado', '{"creditLimit":{"from":2000000,"to":4000000}}', 60),
    (3, 'sales', 1, 'create', NULL, '{"serial":"PED-0001"}', 50),
    (9, 'payments', 1, 'verify', 'Efectivo contado en caja', '{"status":{"from":"review","to":"verified"}}', 48),
    (5, 'stock', 10, 'adjust', 'Conteo físico', '{"available":{"from":20,"to":18}}', 40),
    (1, 'products', 12, 'update', 'Cambio de tarifa p2', '{"p2":{"from":52000,"to":54500}}', 36),
    (7, 'sales', 3, 'invoice', NULL, '{"stage":{"from":"packing_ok","to":"invoicing"}}', 30),
    (2, 'warehouses', 3, 'update', 'Datos de contacto', '{"phone":"6021234567"}', 24),
    (10, 'cash_sessions', 1, 'open', NULL, '{"openingAmount":200000}', 12),
    (4, 'quotations', 2, 'send', NULL, '{"status":{"from":"draft","to":"sent"}}', 8),
    (1, 'employees', 9, 'update', 'Cambio de bodega principal', '{"warehouseId":{"from":2,"to":1}}', 4),
    (8, 'bank_statement_records', 3, 'ignore', 'No corresponde a ningún pago', '{"status":{"from":"pending","to":"ignored"}}', 2)
) AS v(employee_id, entity, entity_id, action, reason, changes, hours)
WHERE NOT EXISTS (SELECT 1 FROM audit_logs a WHERE a.company_id = 1 AND a.entity = v.entity AND a.entity_id = v.entity_id AND a.action = v.action);

-- 7) Papelera: un cliente y una marca eliminados, para probar la restauración
INSERT INTO customers (company_id, document_type, document, person_type, name, last_name, email, mobile, city, price_tier, status, deleted_at)
SELECT 1, 'CC', '79000111', 'natural', 'Roberto', 'Eliminado Demo', 'roberto.demo@correo.com', '3000000111', 'Cali', 'p1', 'inactive', CURRENT_TIMESTAMP - INTERVAL '2 days'
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE company_id = 1 AND document = '79000111');

INSERT INTO brands (company_id, name, is_active)
SELECT 1, 'MARCA OBSOLETA DEMO', FALSE
WHERE NOT EXISTS (SELECT 1 FROM brands WHERE company_id = 1 AND name = 'MARCA OBSOLETA DEMO');

INSERT INTO recycle_bin (company_id, entity_table, entity_id, entity_label, entity_data, deleted_by_actor_type, deleted_by_actor_id, deleted_at)
SELECT 1, 'customers', c.id, 'Roberto Eliminado Demo (CC 79000111)', jsonb_build_object('name', c.name, 'document', c.document), 'employee', 1, c.deleted_at
FROM customers c
WHERE c.company_id = 1 AND c.document = '79000111' AND NOT EXISTS (SELECT 1 FROM recycle_bin r WHERE r.entity_table = 'customers' AND r.entity_id = c.id);

INSERT INTO recycle_bin (company_id, entity_table, entity_id, entity_label, entity_data, deleted_by_actor_type, deleted_by_actor_id, deleted_at)
SELECT 1, 'brands', b.id, 'Marca MARCA OBSOLETA DEMO', jsonb_build_object('name', b.name), 'employee', 1, CURRENT_TIMESTAMP - INTERVAL '1 day'
FROM brands b
WHERE b.company_id = 1 AND b.name = 'MARCA OBSOLETA DEMO' AND NOT EXISTS (SELECT 1 FROM recycle_bin r WHERE r.entity_table = 'brands' AND r.entity_id = b.id);

-- 8) Carrito abierto de un vendedor de la bodega 1 con dos renglones
INSERT INTO carts (company_id, employee_id, customer_id, warehouse_id, price_tier, status)
SELECT 1, 3, NULL, 1, 'p1', 'open'
WHERE NOT EXISTS (SELECT 1 FROM carts WHERE employee_id = 3 AND warehouse_id = 1 AND status = 'open');

INSERT INTO cart_items (cart_id, product_id, stock_id, quantity, unit_price)
SELECT c.id, s.product_id, s.id, 2, 45000.00
FROM carts c
JOIN (SELECT id, product_id FROM stock WHERE warehouse_id = 1 AND product_id BETWEEN 20 AND 400 AND product_id % 3 = 2 AND available >= 20 ORDER BY product_id DESC LIMIT 2) s ON TRUE
WHERE c.employee_id = 3 AND c.warehouse_id = 1 AND c.status = 'open'
ON CONFLICT (cart_id, stock_id) DO NOTHING;
-- 9) IVA por producto: la mayoría al 19 %, algunos al 5 % y otros exentos (0 %), para probar los tres casos al vender
-- ojo: las tarifas son valores netos; el IVA se suma aparte al vender
UPDATE products SET iva = 0 WHERE iva = 19 AND id % 10 = 0;
UPDATE products SET iva = 5 WHERE iva = 19 AND id % 10 = 5;

-- Limpieza de funciones temporales de semilla
DROP FUNCTION IF EXISTS seed_product CASCADE;

-- 10) Sincronización universal de todas las secuencias IDENTITY/SERIAL al máximo ID existente
DO $sync_all_sequences$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT table_name, column_name, pg_get_serial_sequence(quote_ident(table_name), quote_ident(column_name)) AS seq
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND (column_default LIKE 'nextval%' OR is_identity = 'YES')
    ) LOOP
        IF r.seq IS NOT NULL THEN
            EXECUTE format('SELECT setval(%L, GREATEST(COALESCE((SELECT MAX(%I) FROM %I), 1), 1))', r.seq, r.column_name, r.table_name);
        END IF;
    END LOOP;
END
$sync_all_sequences$;

COMMIT;
