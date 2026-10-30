-- ============================================================
-- GESTIÓN IMPORTADORA - BASE DE DATOS V4 FINAL (CON DATOS SEMILLA)
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
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    range_from          BIGINT,
    range_to            BIGINT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (range_from IS NULL OR range_to IS NULL OR range_to >= range_from)
);

CREATE INDEX idx_warehouse_facturation_company ON warehouse_facturation (company_id);

-- 5. TABLA: warehouse_locations (Ubicaciones físicas administrables por bodega)
CREATE TABLE warehouse_locations (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    warehouse_id    BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    code            VARCHAR(60) NOT NULL,
    description     TEXT,
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
    origin_warehouse_id         BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    destination_warehouse_id    BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    employee_id                 BIGINT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    dispatched_by_employee_id   BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    received_by_employee_id     BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    status                      VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_transit', 'received', 'cancelled')),
    notes                       TEXT,
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
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 hour'),
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
    sale_at                     TIMESTAMPTZ,
    due_date                    DATE,
    shipping_address            JSONB,
    carrier_id                  BIGINT REFERENCES externals(id) ON DELETE SET NULL,
    tracking_no                 VARCHAR(80),
    cancel_reason               TEXT,
    cancelled_by_employee_id    BIGINT REFERENCES employees(id) ON DELETE SET NULL,
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
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, serial_code)
);

CREATE INDEX idx_payments_sale_status ON payments (sale_id, status);
CREATE INDEX idx_payments_customer ON payments (customer_id);

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

-- 42. TABLA: notifications
CREATE TABLE notifications (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id     BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    kind            VARCHAR(20) NOT NULL DEFAULT 'info'
        CHECK (kind IN ('info', 'success', 'warning', 'error')),
    title           VARCHAR(160) NOT NULL,
    body            TEXT,
    entity          VARCHAR(60),
    entity_id       BIGINT,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_employee_unread
    ON notifications (employee_id, created_at DESC)
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

-- ============================================================
-- PARTE 4: DATOS SEMILLA LIMPIOS DE OPERACIÓN (SEED DEMO)
-- ============================================================

-- ============================================================================
-- SCRIPT DE DATOS SEMILLA LIMPIOS (PGADMIN)
-- IMPORTADORA PREMIUM ONLINE SAS
-- Compatible con PostgreSQL V4 (Esquema Limpio)
-- ============================================================================

BEGIN;

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

-- 6. PROVEEDORES REALES (externals)
INSERT INTO externals (id, company_id, kind, document_type, document, name, contact_name, phone, email, is_active)
OVERRIDING SYSTEM VALUE
VALUES 
    (10, 1, 'supplier', 'NIT', '900123456', 'BAJAJ COLOMBIA MOTORS S.A.S.', 'BAJAJ OFICIAL', '3120001122', 'proveedores@bajaj.com.co', TRUE),
    (11, 1, 'supplier', 'NIT', '900987654', 'DISTRIBUIDORA DE REPUESTOS JAPON SAS', 'REPUESTOS JAPON', '3158889900', 'ventas@japonrepuestos.com', TRUE)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 7. CLIENTES DE PRUEBA (customers)
-- A. Cliente Mostrador por defecto
INSERT INTO customers (id, company_id, document_type, document, person_type, name, trade_name, credit_enabled, credit_limit, credit_days, credit_warning_pct, status)
OVERRIDING SYSTEM VALUE
VALUES (1, 1, 'NIT', '222222222222', 'legal', 'Consumidor Final', 'Cliente Mostrador', FALSE, 0.00, 0, 70.00, 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, credit_warning_pct = EXCLUDED.credit_warning_pct;

-- B. Cliente con cupo disponible normal (0% ocupado)
INSERT INTO customers (id, company_id, document_type, document, person_type, name, trade_name, credit_enabled, credit_limit, credit_days, credit_warning_pct, status)
OVERRIDING SYSTEM VALUE
VALUES (2, 1, 'CC', '1004260479', 'natural', 'VICTOR MANUEL ROJAS', 'TALLER ROJAS', TRUE, 2000000.00, 30, 70.00, 'active')
ON CONFLICT (id) DO UPDATE SET credit_limit = EXCLUDED.credit_limit, credit_warning_pct = EXCLUDED.credit_warning_pct;

-- C. Cliente con 75% de crédito ocupado (Para disparar anuncio de advertencia >= 70%)
INSERT INTO customers (id, company_id, document_type, document, person_type, name, trade_name, credit_enabled, credit_limit, credit_days, credit_warning_pct, status)
OVERRIDING SYSTEM VALUE
VALUES (3, 1, 'NIT', '901555444', 'legal', 'MOTO REPUESTOS EL PAISA SAS', 'EL PAISA MOTOS', TRUE, 5000000.00, 30, 70.00, 'active')
ON CONFLICT (id) DO UPDATE SET credit_limit = EXCLUDED.credit_limit, credit_warning_pct = EXCLUDED.credit_warning_pct;

-- Asignar saldo de deuda de $3.750.000 (75% de 5M)
INSERT INTO credit_entries (company_id, customer_id, entry_type, amount, reason)
VALUES (1, 3, 'charge', -3750000.00, 'Saldo inicial cargado para prueba de advertencia de cupo al 75%')
ON CONFLICT DO NOTHING;

-- D. Cliente en mora (Facturas vencidas)
INSERT INTO customers (id, company_id, document_type, document, person_type, name, trade_name, credit_enabled, credit_limit, credit_days, credit_warning_pct, status)
OVERRIDING SYSTEM VALUE
VALUES (4, 1, 'NIT', '900333222', 'legal', 'DISTRIBUIDORA MOTOSUR LTDA', 'MOTOSUR', TRUE, 3000000.00, 15, 70.00, 'overdue')
ON CONFLICT (id) DO UPDATE SET status = 'overdue', credit_limit = EXCLUDED.credit_limit;

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

COMMIT;

-- ============================================================================
-- FIN DE SCRIPT DE SEMILLAS
-- ============================================================================
