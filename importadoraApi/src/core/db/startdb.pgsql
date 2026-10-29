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
DROP TABLE IF EXISTS price_levels CASCADE;
DROP TABLE IF EXISTS company_brands CASCADE;
DROP TABLE IF EXISTS customer_discounts CASCADE;
DROP TABLE IF EXISTS third_parties CASCADE;
DROP TABLE IF EXISTS partners CASCADE;
DROP TABLE IF EXISTS user_warehouses CASCADE;
DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
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

-- 5. TABLA: roles (Descriptivos por compañía, sin area y sin permisos asociados)
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
    prices          JSONB NOT NULL DEFAULT '{"p1":0,"p2":0,"p3":0,"p4":0}'::jsonb
        CHECK (
            jsonb_typeof(prices) = 'object'
            AND prices ? 'p1'
            AND prices ? 'p2'
            AND prices ? 'p3'
            AND prices ? 'p4'
        ),
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

-- 43. TABLA: schema_migrations (Compatible con src/db/migrations/migrator.js)
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
    p.prices,
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
-- PARTE 4: DATOS SEMILLA INICIALES (SEED DATA)
-- ============================================================

-- 1. Superusuario desarrollador global (contraseña: 123456)
INSERT INTO superadmins (username, email, password_hash, first_name, last_name, phone, access_level)
VALUES (
    'superdev',
    'superadminImportadora@gmail.com',
    crypt('123456', gen_salt('bf')),
    'Superusuario',
    'Desarrollador',
    '3001002000',
    'developer'
);

-- 2. Compañías independientes (todas al mismo nivel, sin is_host y sin facturación directa)
INSERT INTO companies (created_by_superadmin_id, name, email, phone, address, city)
VALUES
    (1, 'Gestión Importadora Principal', 'contacto@gestionimportadora.com', '6017450000', 'Av. Calle 26 # 68-90', 'Bogotá'),
    (1, 'Importadora del Norte', 'contacto@importadoradelnorte.com', '6043209900', 'Carrera 43A # 14-50', 'Medellín');

-- 3. Bodegas por compañía (todas al mismo nivel, sin is_main)
INSERT INTO warehouses (company_id, code, name, city, address, phone, description)
VALUES
    (1, 'BOD-01', 'Bodega Bogotá Centro', 'Bogotá', 'Calle 13 # 28-45', '6017450001', 'Bodega operativa zona centro'),
    (1, 'BOD-02', 'Bodega Bogotá Norte', 'Bogotá', 'Autopista Norte # 142-20', '6017450002', 'Bodega operativa zona norte'),
    (2, 'BOD-N01', 'Bodega Medellín Sur', 'Medellín', 'Carrera 50 # 12 Sur-30', '6043209901', 'Bodega operativa Antioquia');

-- 4. Configuración de facturación directa por bodega (warehouse_facturation: juridica | natural)
INSERT INTO warehouse_facturation (
    company_id, warehouse_id, type_facturation, document_type, nit, legal_name, trade_name,
    billing_email, billing_phone, billing_address, billing_city,
    vat_withholder, income_withholder, self_withholder,
    invoice_prefix, resolution_number, resolution_date, range_from, range_to
)
VALUES
    (
        1,
        (SELECT id FROM warehouses WHERE company_id = 1 AND code = 'BOD-01'),
        'juridica', 'NIT', '901456789-1',
        'GESTION IMPORTADORA PRINCIPAL S.A.S.', 'Importadora Bogotá Centro',
        'facturacion.bod01@gestionimportadora.com', '6017450001', 'Calle 13 # 28-45', 'Bogotá',
        TRUE, TRUE, FALSE,
        'FE1-', '18764000001111', '2026-01-15', 1, 50000
    ),
    (
        1,
        (SELECT id FROM warehouses WHERE company_id = 1 AND code = 'BOD-02'),
        'natural', 'CC', '79888999',
        'CARLOS ANDRES MENDOZA RUIZ', 'Distribución Bogotá Norte',
        'facturacion.bod02@gestionimportadora.com', '6017450002', 'Autopista Norte # 142-20', 'Bogotá',
        FALSE, FALSE, FALSE,
        'FE2-', '18764000002222', '2026-01-15', 1, 20000
    ),
    (
        2,
        (SELECT id FROM warehouses WHERE company_id = 2 AND code = 'BOD-N01'),
        'juridica', 'NIT', '901999888-5',
        'IMPORTADORA DEL NORTE S.A.S.', 'Importadora del Norte Medellín',
        'facturacion@importadoradelnorte.com', '6043209901', 'Carrera 50 # 12 Sur-30', 'Medellín',
        TRUE, FALSE, FALSE,
        'FEN-', '18764000003333', '2026-02-01', 1, 30000
    );

-- 5. Roles descriptivos por compañía (sin campo area y sin permisos)
INSERT INTO roles (company_id, code, name, description)
VALUES
    (1, 'vendedor', 'Vendedor Comercial', 'Atención comercial, cotizaciones y creación de pedidos/ventas'),
    (1, 'bodeguero', 'Operario de Bodega', 'Picking, packing, despacho, recepción de traslados y conteos físicos'),
    (1, 'facturador', 'Facturador y Verificador', 'Verificación de pedidos y emisión de facturación por bodega'),
    (1, 'cartera', 'Analista de Cartera', 'Gestión de pagos, abonos, cupos de crédito y conciliación'),
    (1, 'compras', 'Analista de Compras', 'Gestión de órdenes de compra, proveedores y catálogo'),
    (2, 'vendedor', 'Vendedor Comercial', 'Atención comercial y ventas en Importadora del Norte'),
    (2, 'bodeguero', 'Operario de Bodega', 'Operación logística e inventario en Importadora del Norte');

-- 6. Catálogo maestro de permisos habilitables
INSERT INTO permissions (module, action, description)
VALUES
    ('products', 'view', 'Consultar catálogo y precios p1..p4 de productos'),
    ('products', 'create', 'Crear nuevos productos'),
    ('products', 'edit', 'Editar productos y precios p1..p4'),
    ('products', 'delete', 'Inactivar o eliminar productos'),
    ('categories', 'manage', 'Crear y editar categorías, marcas y modelos'),
    ('warehouses', 'view', 'Consultar bodegas'),
    ('warehouses', 'manage', 'Crear y editar bodegas'),
    ('warehouses', 'facturation', 'Configurar datos fiscales de facturación por bodega'),
    ('stock', 'view', 'Consultar existencias por bodega y ubicación'),
    ('stock', 'adjust', 'Realizar ajustes manuales de inventario'),
    ('counts', 'manage', 'Abrir, registrar y corroborar conteos físicos'),
    ('transfers', 'view', 'Consultar traslados entre bodegas'),
    ('transfers', 'create', 'Crear solicitud de traslado multi-ítem entre bodegas'),
    ('transfers', 'dispatch', 'Despachar traslado desde bodega origen'),
    ('transfers', 'receive', 'Recibir traslado en bodega destino'),
    ('customers', 'view', 'Consultar ficha de clientes'),
    ('customers', 'create', 'Registrar clientes nuevos'),
    ('customers', 'edit', 'Actualizar datos, lista p1..p4, descuento y cupo del cliente'),
    ('customers', 'documents', 'Adjuntar y gestionar documentos del cliente'),
    ('externals', 'view', 'Consultar proveedores, transportadoras y externos'),
    ('externals', 'manage', 'Crear y editar externos'),
    ('sales', 'view', 'Consultar pedidos y ventas'),
    ('sales', 'create', 'Crear pedidos y carritos de venta'),
    ('sales', 'verify', 'Verificar pedidos comerciales (Verificación -> Verificación exitosa)'),
    ('sales', 'pick', 'Ejecutar picking de renglones (Picking -> Picking exitoso)'),
    ('sales', 'pack', 'Ejecutar packing de renglones (Packing -> Packing exitoso)'),
    ('sales', 'invoice', 'Facturar pedidos desde la bodega (Facturación -> Facturación exitosa)'),
    ('sales', 'dispatch', 'Gestionar despacho y confirmar envío (Despacho -> Enviado)'),
    ('sales', 'cancel', 'Cancelar pedidos abiertos'),
    ('quotations', 'manage', 'Crear, enviar y convertir cotizaciones'),
    ('returns', 'create', 'Registrar solicitudes de devolución'),
    ('returns', 'approve', 'Aprobar o rechazar devoluciones'),
    ('payments', 'view', 'Consultar pagos y cartera'),
    ('payments', 'create', 'Registrar recibos de pago o abonos'),
    ('payments', 'verify', 'Verificar o anular pagos'),
    ('purchases', 'view', 'Consultar órdenes de compra'),
    ('purchases', 'manage', 'Crear y recibir órdenes de compra en bodega'),
    ('invoices', 'view', 'Consultar facturas y notas crédito emitidas por bodega'),
    ('audit', 'view', 'Consultar auditoría de movimientos y sistema');

-- 7. Empleados por compañía (contraseña: 123456)
INSERT INTO employees (
    company_id, role_id, warehouse_id, email, password_hash,
    first_name, last_name, document_type, document, phone, work_modality
)
VALUES
    (
        1,
        (SELECT id FROM roles WHERE company_id = 1 AND code = 'vendedor'),
        (SELECT id FROM warehouses WHERE company_id = 1 AND code = 'BOD-01'),
        'vendedor1Importadora@gmail.com', crypt('123456', gen_salt('bf')),
        'Andrés', 'Gómez Ríos', 'CC', '1010001001', '3101110001', 'onsite'
    ),
    (
        1,
        (SELECT id FROM roles WHERE company_id = 1 AND code = 'vendedor'),
        (SELECT id FROM warehouses WHERE company_id = 1 AND code = 'BOD-02'),
        'vendedor2Importadora@gmail.com', crypt('123456', gen_salt('bf')),
        'Laura', 'Martínez Soto', 'CC', '1010001002', '3101110002', 'hybrid'
    ),
    (
        1,
        (SELECT id FROM roles WHERE company_id = 1 AND code = 'bodeguero'),
        (SELECT id FROM warehouses WHERE company_id = 1 AND code = 'BOD-01'),
        'bodeguero1Importadora@gmail.com', crypt('123456', gen_salt('bf')),
        'Miguel', 'Torres Peña', 'CC', '1010001003', '3101110003', 'onsite'
    ),
    (
        1,
        (SELECT id FROM roles WHERE company_id = 1 AND code = 'bodeguero'),
        (SELECT id FROM warehouses WHERE company_id = 1 AND code = 'BOD-02'),
        'bodeguero2Importadora@gmail.com', crypt('123456', gen_salt('bf')),
        'Camilo', 'Vargas León', 'CC', '1010001004', '3101110004', 'onsite'
    ),
    (
        1,
        (SELECT id FROM roles WHERE company_id = 1 AND code = 'facturador'),
        (SELECT id FROM warehouses WHERE company_id = 1 AND code = 'BOD-01'),
        'facturador1Importadora@gmail.com', crypt('123456', gen_salt('bf')),
        'Diana', 'Rojas Castro', 'CC', '1010001005', '3101110005', 'onsite'
    ),
    (
        1,
        (SELECT id FROM roles WHERE company_id = 1 AND code = 'cartera'),
        (SELECT id FROM warehouses WHERE company_id = 1 AND code = 'BOD-01'),
        'cartera1Importadora@gmail.com', crypt('123456', gen_salt('bf')),
        'Paola', 'Herrera Díaz', 'CC', '1010001006', '3101110006', 'hybrid'
    ),
    (
        1,
        (SELECT id FROM roles WHERE company_id = 1 AND code = 'compras'),
        (SELECT id FROM warehouses WHERE company_id = 1 AND code = 'BOD-01'),
        'compras1Importadora@gmail.com', crypt('123456', gen_salt('bf')),
        'Jorge', 'Salazar Mora', 'CC', '1010001007', '3101110007', 'onsite'
    ),
    (
        2,
        (SELECT id FROM roles WHERE company_id = 2 AND code = 'vendedor'),
        (SELECT id FROM warehouses WHERE company_id = 2 AND code = 'BOD-N01'),
        'vendedorNorte@gmail.com', crypt('123456', gen_salt('bf')),
        'Sebastián', 'Restrepo Gil', 'CC', '1020002001', '3122220001', 'onsite'
    );

-- 8. Administradores por compañía (contraseña: 123456)
INSERT INTO admins (
    company_id, created_by_superadmin_id, email, password_hash,
    first_name, last_name, document_type, document, phone
)
VALUES
    (
        1, 1, 'adminImportadora@gmail.com', crypt('123456', gen_salt('bf')),
        'Carlos', 'Mendoza Ruiz', 'CC', '79888999', '3150001111'
    ),
    (
        2, 1, 'admin2Importadora@gmail.com', crypt('123456', gen_salt('bf')),
        'Natalia', 'Ospina Vélez', 'CC', '43999888', '3150002222'
    );

-- 9. Asignación directa de permisos habilitados a cada empleado (employee_permissions)
-- Vendedores compañía 1
INSERT INTO employee_permissions (employee_id, permission_id, granted_by_admin_id)
SELECT e.id, p.id, (SELECT id FROM admins WHERE email = 'adminImportadora@gmail.com')
FROM employees e
CROSS JOIN permissions p
WHERE e.email IN ('vendedor1Importadora@gmail.com', 'vendedor2Importadora@gmail.com')
  AND (
      (p.module = 'products' AND p.action = 'view')
      OR (p.module = 'stock' AND p.action = 'view')
      OR (p.module = 'customers' AND p.action IN ('view', 'create', 'documents'))
      OR (p.module = 'sales' AND p.action IN ('view', 'create'))
      OR (p.module = 'quotations' AND p.action = 'manage')
      OR (p.module = 'payments' AND p.action = 'create')
  );

-- Bodegueros compañía 1
INSERT INTO employee_permissions (employee_id, permission_id, granted_by_admin_id)
SELECT e.id, p.id, (SELECT id FROM admins WHERE email = 'adminImportadora@gmail.com')
FROM employees e
CROSS JOIN permissions p
WHERE e.email IN ('bodeguero1Importadora@gmail.com', 'bodeguero2Importadora@gmail.com')
  AND (
      (p.module = 'products' AND p.action = 'view')
      OR (p.module = 'warehouses' AND p.action = 'view')
      OR (p.module = 'stock' AND p.action IN ('view', 'adjust'))
      OR (p.module = 'counts' AND p.action = 'manage')
      OR (p.module = 'transfers' AND p.action IN ('view', 'create', 'dispatch', 'receive'))
      OR (p.module = 'sales' AND p.action IN ('view', 'pick', 'pack', 'dispatch'))
  );

-- Facturador compañía 1
INSERT INTO employee_permissions (employee_id, permission_id, granted_by_admin_id)
SELECT e.id, p.id, (SELECT id FROM admins WHERE email = 'adminImportadora@gmail.com')
FROM employees e
CROSS JOIN permissions p
WHERE e.email = 'facturador1Importadora@gmail.com'
  AND (
      (p.module = 'sales' AND p.action IN ('view', 'verify', 'invoice', 'cancel'))
      OR (p.module = 'invoices' AND p.action = 'view')
      OR (p.module = 'payments' AND p.action IN ('view', 'verify'))
      OR (p.module = 'customers' AND p.action = 'view')
      OR (p.module = 'returns' AND p.action IN ('create', 'approve'))
  );

-- Cartera compañía 1
INSERT INTO employee_permissions (employee_id, permission_id, granted_by_admin_id)
SELECT e.id, p.id, (SELECT id FROM admins WHERE email = 'adminImportadora@gmail.com')
FROM employees e
CROSS JOIN permissions p
WHERE e.email = 'cartera1Importadora@gmail.com'
  AND (
      (p.module = 'customers' AND p.action IN ('view', 'edit', 'documents'))
      OR (p.module = 'payments' AND p.action IN ('view', 'create', 'verify'))
      OR (p.module = 'sales' AND p.action = 'view')
      OR (p.module = 'invoices' AND p.action = 'view')
  );

-- Compras compañía 1
INSERT INTO employee_permissions (employee_id, permission_id, granted_by_admin_id)
SELECT e.id, p.id, (SELECT id FROM admins WHERE email = 'adminImportadora@gmail.com')
FROM employees e
CROSS JOIN permissions p
WHERE e.email = 'compras1Importadora@gmail.com'
  AND (
      (p.module = 'products' AND p.action IN ('view', 'create', 'edit'))
      OR (p.module = 'categories' AND p.action = 'manage')
      OR (p.module = 'externals' AND p.action IN ('view', 'manage'))
      OR (p.module = 'purchases' AND p.action IN ('view', 'manage'))
      OR (p.module = 'stock' AND p.action = 'view')
  );

-- Vendedor compañía 2
INSERT INTO employee_permissions (employee_id, permission_id, granted_by_admin_id)
SELECT e.id, p.id, (SELECT id FROM admins WHERE email = 'admin2Importadora@gmail.com')
FROM employees e
CROSS JOIN permissions p
WHERE e.email = 'vendedorNorte@gmail.com'
  AND p.module IN ('products', 'stock', 'customers', 'sales', 'quotations')
  AND p.action IN ('view', 'create', 'manage');

-- 10. Inicialización limpia de control de intentos de login para empleados semilla
INSERT INTO employee_login_attempts (employee_id, email, failed_login_count)
SELECT id, email, 0 FROM employees;

-- 11. Clientes y documentos del cliente
INSERT INTO customers (
    company_id, document_type, document, person_type, name, last_name, trade_name,
    legal_representative, email, phone, mobile, address, city, vat_responsible,
    price_tier, discount_percent, credit_enabled, credit_limit, credit_days, status
)
VALUES
    (
        1, 'NIT', '222222222222', 'natural', 'Consumidor Final', NULL, 'Cliente Mostrador',
        NULL, NULL, NULL, NULL, 'Mostrador', 'Bogotá', FALSE,
        'p1', 0.00, FALSE, 0, 0, 'active'
    ),
    (
        1, 'CC', '1020304050', 'natural', 'Juan', 'Pérez Gómez', 'MotoRepuestos Juan',
        NULL, 'juan.perez@example.com', '6014445566', '3001234567', 'Calle 10 # 5-30', 'Bogotá', FALSE,
        'p2', 3.00, TRUE, 2500000, 30, 'active'
    ),
    (
        1, 'NIT', '900123456-7', 'legal', 'Taller El Rápido S.A.S.', NULL, 'El Rápido Motos',
        'María Fernanda García', 'compras@elrapido.com', '6012345678', '3119876543', 'Carrera 45 # 12-10', 'Bogotá', TRUE,
        'p3', 5.00, TRUE, 8000000, 45, 'active'
    ),
    (
        2, 'NIT', '222222222222', 'natural', 'Consumidor Final', NULL, 'Mostrador Medellín',
        NULL, NULL, NULL, NULL, 'Mostrador', 'Medellín', FALSE,
        'p1', 0.00, FALSE, 0, 0, 'active'
    );

INSERT INTO customer_documents (customer_id, doc_type, file_name, file_url, mime_type, notes)
VALUES
    (
        (SELECT id FROM customers WHERE company_id = 1 AND document = '900123456-7'),
        'rut', 'RUT_Taller_El_Rapido_2026.pdf', '/uploads/customers/rut_900123456.pdf', 'application/pdf', 'RUT actualizado vigente'
    ),
    (
        (SELECT id FROM customers WHERE company_id = 1 AND document = '900123456-7'),
        'chamber', 'Camara_Comercio_El_Rapido.pdf', '/uploads/customers/camara_900123456.pdf', 'application/pdf', 'Certificado menor a 30 días'
    );

-- 12. Externos (Proveedores y Transportadoras)
INSERT INTO externals (
    company_id, kind, document_type, document, name, contact_name, contact_phone,
    email, city, terms_days, credit_limit, coverage
)
VALUES
    (1, 'supplier', 'NIT', '800100001-1', 'Yamaha Motor Colombia', 'Ricardo Mejía', '3105550101', 'ventas@yamaha-col.example.com', 'Medellín', 30, 25000000, NULL),
    (1, 'supplier', 'NIT', '800100002-2', 'Suzuki Motor de Colombia', 'Elena Pardo', '3105550202', 'mayoristas@suzuki-col.example.com', 'Pereira', 30, 20000000, NULL),
    (1, 'supplier', 'NIT', '800100004-4', 'Lubricantes del Pacífico S.A.S.', 'Óscar Duarte', '3105550404', 'pedidos@lubripacifico.example.com', 'Cali', 15, 15000000, NULL),
    (1, 'carrier', 'NIT', '860512330-3', 'Servientrega S.A.', 'Despachos Corporativos', '6017700200', 'corporativo@servientrega.example.com', 'Bogotá', 0, 0, 'Nacional'),
    (1, 'carrier', 'NIT', '800185306-4', 'Envía Colvanes', 'Línea Logística', '6014430000', 'logistica@envia.example.com', 'Bogotá', 0, 0, 'Nacional'),
    (2, 'supplier', 'NIT', '800100099-9', 'Distribuidora Antioquia Motos', 'Julián Cano', '3147778899', 'ventas@antmotos.example.com', 'Medellín', 30, 12000000, NULL);

-- 13. Catálogo: Marcas, Modelos (con description) y Categorías (padre + subcategorías)
INSERT INTO brands (company_id, name)
VALUES
    (1, 'Kixx'),
    (1, 'Shell'),
    (1, 'Castrol'),
    (1, 'Mobil'),
    (1, 'Honda'),
    (1, 'Yamaha'),
    (2, 'Yamaha');

INSERT INTO models (company_id, name, description)
VALUES
    (1, '15W40', 'Viscosidad multigrado 15W-40 para motores diésel y gasolina de trabajo pesado'),
    (1, '20W50', 'Viscosidad 20W-50 4 tiempos de alta protección térmica'),
    (1, '10W30', 'Viscosidad sintética/semisintética 10W-30 de baja fricción'),
    (1, 'ULTRA 4T', 'Línea sintética de alto desempeño para motocicletas 4T'),
    (1, 'STD-OEM', 'Referencia estándar tipo original de fábrica'),
    (2, '20W50', 'Viscosidad estándar 20W-50');

-- Categorías padre
INSERT INTO categories (company_id, parent_id, name, description)
VALUES
    (1, NULL, 'LUBRICANTES Y FLUIDOS', 'Categoría padre de aceites, líquidos de freno y refrigerantes'),
    (1, NULL, 'REPUESTOS DE MOTOR', 'Categoría padre de filtros, bujías y componentes internos'),
    (2, NULL, 'LUBRICANTES', 'Categoría general de lubricantes');

-- Subcategorías hijas (usando parent_id)
INSERT INTO categories (company_id, parent_id, name, description)
VALUES
    (
        1,
        (SELECT id FROM categories WHERE company_id = 1 AND parent_id IS NULL AND name = 'LUBRICANTES Y FLUIDOS'),
        'ACEITES MOTOR 4T',
        'Aceites lubricantes para motocicletas de 4 tiempos'
    ),
    (
        1,
        (SELECT id FROM categories WHERE company_id = 1 AND parent_id IS NULL AND name = 'REPUESTOS DE MOTOR'),
        'FILTROS Y MANTENIMIENTO',
        'Filtros de aceite, aire y consumibles preventivos'
    );

-- 14. Productos (siempre anexados a una categoría existente, con iva NULL/0=exento o 19.00, y prices p1..p4)
INSERT INTO products (
    company_id, category_id, brand_id, model_id, code, name, description, unit, iva, prices, last_cost, is_promotion
)
VALUES
    (
        1,
        (SELECT id FROM categories WHERE company_id = 1 AND name = 'ACEITES MOTOR 4T'),
        (SELECT id FROM brands WHERE company_id = 1 AND name = 'Kixx'),
        (SELECT id FROM models WHERE company_id = 1 AND name = '15W40'),
        '8801470510011', 'ACEITE KIXX 15W40 1L', 'Lubricante Kixx 15W40 presentación cuarto/litro', 'UND',
        19.00, '{"p1":28000,"p2":26500,"p3":25000,"p4":23500}'::jsonb, 18000, FALSE
    ),
    (
        1,
        (SELECT id FROM categories WHERE company_id = 1 AND name = 'ACEITES MOTOR 4T'),
        (SELECT id FROM brands WHERE company_id = 1 AND name = 'Shell'),
        (SELECT id FROM models WHERE company_id = 1 AND name = '20W50'),
        '5011987033207', 'ACEITE SHELL ADVANCE AX5 20W50', 'Lubricante mineral premium 20W50 4T', 'UND',
        19.00, '{"p1":32000,"p2":30200,"p3":28800,"p4":27000}'::jsonb, 21000, FALSE
    ),
    (
        1,
        (SELECT id FROM categories WHERE company_id = 1 AND name = 'ACEITES MOTOR 4T'),
        (SELECT id FROM brands WHERE company_id = 1 AND name = 'Castrol'),
        (SELECT id FROM models WHERE company_id = 1 AND name = '20W50'),
        '79191261187', 'ACEITE CASTROL ACTEVO 20W50 4T', 'Con moléculas Actibond de protección continua', 'UND',
        19.00, '{"p1":35000,"p2":33200,"p3":31500,"p4":29800}'::jsonb, 23500, TRUE
    ),
    (
        1,
        (SELECT id FROM categories WHERE company_id = 1 AND name = 'ACEITES MOTOR 4T'),
        (SELECT id FROM brands WHERE company_id = 1 AND name = 'Honda'),
        (SELECT id FROM models WHERE company_id = 1 AND name = '10W30'),
        '7701234000011', 'ACEITE GENUINO HONDA 10W30', 'Aceite original Honda Pro 4T 10W30', 'UND',
        19.00, '{"p1":36000,"p2":34000,"p3":32500,"p4":31000}'::jsonb, 24000, FALSE
    ),
    (
        1,
        (SELECT id FROM categories WHERE company_id = 1 AND name = 'ACEITES MOTOR 4T'),
        (SELECT id FROM brands WHERE company_id = 1 AND name = 'Kixx'),
        (SELECT id FROM models WHERE company_id = 1 AND name = 'ULTRA 4T'),
        '8801470510028', 'ACEITE KIXX ULTRA 4T SINTÉTICO', 'Aceite 100% sintético para alto cilindraje', 'UND',
        19.00, '{"p1":44000,"p2":41500,"p3":39500,"p4":37500}'::jsonb, 29000, FALSE
    ),
    (
        1,
        (SELECT id FROM categories WHERE company_id = 1 AND name = 'ACEITES MOTOR 4T'),
        (SELECT id FROM brands WHERE company_id = 1 AND name = 'Mobil'),
        (SELECT id FROM models WHERE company_id = 1 AND name = '20W50'),
        '7709000112233', 'ACEITE MOBIL SUPER 4T 20W50 (EXENTO)', 'Lote especial exento (iva = 0)', 'UND',
        0.00, '{"p1":29500,"p2":28000,"p3":26500,"p4":25000}'::jsonb, 19500, FALSE
    ),
    (
        1,
        (SELECT id FROM categories WHERE company_id = 1 AND name = 'FILTROS Y MANTENIMIENTO'),
        (SELECT id FROM brands WHERE company_id = 1 AND name = 'Yamaha'),
        (SELECT id FROM models WHERE company_id = 1 AND name = 'STD-OEM'),
        'YAM-FIL-001', 'FILTRO DE ACEITE YAMAHA FZ/XTZ', 'Filtro original elemento microporoso (exento NULL)', 'UND',
        NULL, '{"p1":18000,"p2":16800,"p3":15500,"p4":14200}'::jsonb, 10500, FALSE
    ),
    (
        2,
        (SELECT id FROM categories WHERE company_id = 2 AND name = 'LUBRICANTES'),
        (SELECT id FROM brands WHERE company_id = 2 AND name = 'Yamaha'),
        (SELECT id FROM models WHERE company_id = 2 AND name = '20W50'),
        'YAM-LUB-N01', 'YAMALUBE 4T 20W50 NORTE', 'Producto exclusivo de Importadora del Norte', 'UND',
        19.00, '{"p1":34000,"p2":32500,"p3":31000,"p4":29500}'::jsonb, 22500, FALSE
    );

INSERT INTO product_codes (company_id, product_id, code_type, code)
VALUES
    (1, (SELECT id FROM products WHERE company_id = 1 AND code = '8801470510011'), 'sku', 'SKU-KX-15W40'),
    (1, (SELECT id FROM products WHERE company_id = 1 AND code = '79191261187'), 'sku', 'SKU-CS-ACTEVO'),
    (1, (SELECT id FROM products WHERE company_id = 1 AND code = 'YAM-FIL-001'), 'oem', '5TA-13440-00');

INSERT INTO product_suppliers (product_id, supplier_id, cost, supplier_code)
SELECT
    p.id,
    (SELECT id FROM externals WHERE company_id = 1 AND kind = 'supplier' AND name = 'Lubricantes del Pacífico S.A.S.'),
    p.last_cost,
    'PROV-' || p.code
FROM products p
WHERE p.company_id = 1;

-- 15. Existencias iniciales (stock) en BOD-01, BOD-02 y BOD-N01
INSERT INTO stock (company_id, product_id, warehouse_id, location, available, reserved, min_stock, max_stock)
SELECT
    1,
    p.id,
    (SELECT id FROM warehouses WHERE company_id = 1 AND code = 'BOD-01'),
    CASE WHEN p.id % 2 = 0 THEN 'PAS-A-01' ELSE 'PAS-B-03' END,
    50,
    0,
    10,
    200
FROM products p
WHERE p.company_id = 1;

INSERT INTO stock (company_id, product_id, warehouse_id, location, available, reserved, min_stock, max_stock)
SELECT
    1,
    p.id,
    (SELECT id FROM warehouses WHERE company_id = 1 AND code = 'BOD-02'),
    'EST-N-02',
    25,
    0,
    5,
    120
FROM products p
WHERE p.company_id = 1
  AND p.code IN ('8801470510011', '5011987033207', '79191261187', 'YAM-FIL-001');

INSERT INTO stock (company_id, product_id, warehouse_id, location, available, reserved, min_stock, max_stock)
SELECT
    2,
    p.id,
    (SELECT id FROM warehouses WHERE company_id = 2 AND code = 'BOD-N01'),
    'MED-A-01',
    40,
    0,
    8,
    150
FROM products p
WHERE p.company_id = 2;

-- 16. Series de numeración documental (doc_series) por compañía y por bodega para facturación
INSERT INTO doc_series (company_id, warehouse_id, doc_type, prefix, next_number)
VALUES
    (1, NULL, 'sale', 'PD-', 3),
    (1, NULL, 'transfer', 'TR-', 2),
    (1, NULL, 'quotation', 'CT-', 2),
    (1, NULL, 'purchase', 'OC-', 2),
    (1, NULL, 'payment', 'RC-', 2),
    (1, (SELECT id FROM warehouses WHERE company_id = 1 AND code = 'BOD-01'), 'invoice', 'FE1-', 2),
    (1, (SELECT id FROM warehouses WHERE company_id = 1 AND code = 'BOD-02'), 'invoice', 'FE2-', 1),
    (2, (SELECT id FROM warehouses WHERE company_id = 2 AND code = 'BOD-N01'), 'invoice', 'FEN-', 1);

-- 17. Ejemplo de Traslado Multi-Ítem Bodega <-> Bodega (1 traslado en transfers con 3 ítems distintos en details_transfer)
INSERT INTO transfers (
    company_id, serial_code, origin_warehouse_id, destination_warehouse_id,
    employee_id, dispatched_by_employee_id, received_by_employee_id,
    status, notes, dispatched_at, received_at
)
VALUES (
    1,
    'TR-0001',
    (SELECT id FROM warehouses WHERE company_id = 1 AND code = 'BOD-01'),
    (SELECT id FROM warehouses WHERE company_id = 1 AND code = 'BOD-02'),
    (SELECT id FROM employees WHERE email = 'bodeguero1Importadora@gmail.com'),
    (SELECT id FROM employees WHERE email = 'bodeguero1Importadora@gmail.com'),
    (SELECT id FROM employees WHERE email = 'bodeguero2Importadora@gmail.com'),
    'received',
    'Traslado simultáneo de surtido multi-producto desde Bogotá Centro hacia Bogotá Norte',
    CURRENT_TIMESTAMP - INTERVAL '2 hours',
    CURRENT_TIMESTAMP - INTERVAL '1 hour'
);

INSERT INTO details_transfer (
    transfer_id, product_id, origin_stock_id, destination_stock_id,
    product_code, product_name, destination_location, quantity, received_qty, notes
)
VALUES
    (
        (SELECT id FROM transfers WHERE company_id = 1 AND serial_code = 'TR-0001'),
        (SELECT id FROM products WHERE company_id = 1 AND code = '8801470510011'),
        (SELECT s.id FROM stock s JOIN products p ON p.id = s.product_id JOIN warehouses w ON w.id = s.warehouse_id WHERE p.code = '8801470510011' AND w.code = 'BOD-01'),
        (SELECT s.id FROM stock s JOIN products p ON p.id = s.product_id JOIN warehouses w ON w.id = s.warehouse_id WHERE p.code = '8801470510011' AND w.code = 'BOD-02'),
        '8801470510011', 'ACEITE KIXX 15W40 1L', 'EST-N-02', 6, 6, 'Caja sellada x6'
    ),
    (
        (SELECT id FROM transfers WHERE company_id = 1 AND serial_code = 'TR-0001'),
        (SELECT id FROM products WHERE company_id = 1 AND code = '79191261187'),
        (SELECT s.id FROM stock s JOIN products p ON p.id = s.product_id JOIN warehouses w ON w.id = s.warehouse_id WHERE p.code = '79191261187' AND w.code = 'BOD-01'),
        (SELECT s.id FROM stock s JOIN products p ON p.id = s.product_id JOIN warehouses w ON w.id = s.warehouse_id WHERE p.code = '79191261187' AND w.code = 'BOD-02'),
        '79191261187', 'ACEITE CASTROL ACTEVO 20W50 4T', 'EST-N-02', 4, 4, 'Unidades verificadas sin novedad'
    ),
    (
        (SELECT id FROM transfers WHERE company_id = 1 AND serial_code = 'TR-0001'),
        (SELECT id FROM products WHERE company_id = 1 AND code = 'YAM-FIL-001'),
        (SELECT s.id FROM stock s JOIN products p ON p.id = s.product_id JOIN warehouses w ON w.id = s.warehouse_id WHERE p.code = 'YAM-FIL-001' AND w.code = 'BOD-01'),
        (SELECT s.id FROM stock s JOIN products p ON p.id = s.product_id JOIN warehouses w ON w.id = s.warehouse_id WHERE p.code = 'YAM-FIL-001' AND w.code = 'BOD-02'),
        'YAM-FIL-001', 'FILTRO DE ACEITE YAMAHA FZ/XTZ', 'EST-N-02', 10, 10, 'Empaque original OEM'
    );

-- 18. Ejemplo de Venta Completada y Enviada (Verificación -> Picking -> Packing -> Facturación -> Despacho -> Enviado)
INSERT INTO sales (
    company_id, serial_code, customer_id, employee_id, warehouse_id, price_tier,
    payment_method, payment_condition, immediate_picking, status, current_stage,
    subtotal, discount_total, iva_total, total, paid_total, sale_at,
    carrier_id, tracking_no, notes
)
VALUES (
    1,
    'PD-0001',
    (SELECT id FROM customers WHERE company_id = 1 AND document = '900123456-7'),
    (SELECT id FROM employees WHERE email = 'vendedor1Importadora@gmail.com'),
    (SELECT id FROM warehouses WHERE company_id = 1 AND code = 'BOD-01'),
    'p3',
    'transfer',
    'cash',
    FALSE,
    'completed',
    'sent',
    188000.00,
    0.00,
    29925.00,
    217925.00,
    217925.00,
    CURRENT_TIMESTAMP - INTERVAL '15 minutes',
    (SELECT id FROM externals WHERE company_id = 1 AND kind = 'carrier' AND name = 'Servientrega S.A.'),
    'SRV-99887766',
    'Venta mayorista verificada, alistada, empacada, facturada por BOD-01 y enviada'
);

INSERT INTO sale_items (
    sale_id, product_id, stock_id, product_code, product_name, price_tier,
    quantity, picked_qty, packed_qty, dispatched_qty,
    unit_price, unit_cost, discount, iva_percent, iva_amount, subtotal, line_total,
    process_stage, stage_status,
    verified_by_employee_id, verified_at,
    picked_by_employee_id, picked_at,
    packed_by_employee_id, packed_at,
    invoiced_by_employee_id, invoiced_at,
    dispatched_by_employee_id, dispatched_at,
    sent_by_employee_id, sent_at,
    process_notes
)
VALUES
    (
        (SELECT id FROM sales WHERE company_id = 1 AND serial_code = 'PD-0001'),
        (SELECT id FROM products WHERE company_id = 1 AND code = '79191261187'),
        (SELECT s.id FROM stock s JOIN products p ON p.id = s.product_id JOIN warehouses w ON w.id = s.warehouse_id WHERE p.code = '79191261187' AND w.code = 'BOD-01'),
        '79191261187', 'ACEITE CASTROL ACTEVO 20W50 4T', 'p3',
        5, 5, 5, 5,
        31500.00, 23500.00, 0.00, 19.00, 29925.00, 157500.00, 187425.00,
        'sent', 'completed',
        (SELECT id FROM employees WHERE email = 'facturador1Importadora@gmail.com'), CURRENT_TIMESTAMP - INTERVAL '45 minutes',
        (SELECT id FROM employees WHERE email = 'bodeguero1Importadora@gmail.com'), CURRENT_TIMESTAMP - INTERVAL '35 minutes',
        (SELECT id FROM employees WHERE email = 'bodeguero1Importadora@gmail.com'), CURRENT_TIMESTAMP - INTERVAL '25 minutes',
        (SELECT id FROM employees WHERE email = 'facturador1Importadora@gmail.com'), CURRENT_TIMESTAMP - INTERVAL '15 minutes',
        (SELECT id FROM employees WHERE email = 'bodeguero1Importadora@gmail.com'), CURRENT_TIMESTAMP - INTERVAL '10 minutes',
        (SELECT id FROM employees WHERE email = 'bodeguero1Importadora@gmail.com'), CURRENT_TIMESTAMP - INTERVAL '5 minutes',
        'Renglón verificado, alistado, empacado, facturado y enviado'
    ),
    (
        (SELECT id FROM sales WHERE company_id = 1 AND serial_code = 'PD-0001'),
        (SELECT id FROM products WHERE company_id = 1 AND code = 'YAM-FIL-001'),
        (SELECT s.id FROM stock s JOIN products p ON p.id = s.product_id JOIN warehouses w ON w.id = s.warehouse_id WHERE p.code = 'YAM-FIL-001' AND w.code = 'BOD-01'),
        'YAM-FIL-001', 'FILTRO DE ACEITE YAMAHA FZ/XTZ', 'p3',
        2, 2, 2, 2,
        15250.00, 10500.00, 0.00, NULL, 0.00, 30500.00, 30500.00,
        'sent', 'completed',
        (SELECT id FROM employees WHERE email = 'facturador1Importadora@gmail.com'), CURRENT_TIMESTAMP - INTERVAL '45 minutes',
        (SELECT id FROM employees WHERE email = 'bodeguero1Importadora@gmail.com'), CURRENT_TIMESTAMP - INTERVAL '35 minutes',
        (SELECT id FROM employees WHERE email = 'bodeguero1Importadora@gmail.com'), CURRENT_TIMESTAMP - INTERVAL '25 minutes',
        (SELECT id FROM employees WHERE email = 'facturador1Importadora@gmail.com'), CURRENT_TIMESTAMP - INTERVAL '15 minutes',
        (SELECT id FROM employees WHERE email = 'bodeguero1Importadora@gmail.com'), CURRENT_TIMESTAMP - INTERVAL '10 minutes',
        (SELECT id FROM employees WHERE email = 'bodeguero1Importadora@gmail.com'), CURRENT_TIMESTAMP - INTERVAL '5 minutes',
        'Producto exento (iva NULL) enviado completo'
    );

INSERT INTO payments (
    company_id, serial_code, sale_id, customer_id, employee_id, verified_by_employee_id,
    method, amount, status, reference, verified_at
)
VALUES (
    1,
    'RC-0001',
    (SELECT id FROM sales WHERE company_id = 1 AND serial_code = 'PD-0001'),
    (SELECT id FROM customers WHERE company_id = 1 AND document = '900123456-7'),
    (SELECT id FROM employees WHERE email = 'vendedor1Importadora@gmail.com'),
    (SELECT id FROM employees WHERE email = 'cartera1Importadora@gmail.com'),
    'transfer',
    217925.00,
    'verified',
    'BANCOL-88442211',
    CURRENT_TIMESTAMP - INTERVAL '20 minutes'
);

INSERT INTO invoices (
    company_id, warehouse_id, warehouse_facturation_id, sale_id, employee_id,
    kind, number, status, pdf_url
)
VALUES (
    1,
    (SELECT id FROM warehouses WHERE company_id = 1 AND code = 'BOD-01'),
    (SELECT wf.id FROM warehouse_facturation wf JOIN warehouses w ON w.id = wf.warehouse_id WHERE w.company_id = 1 AND w.code = 'BOD-01'),
    (SELECT id FROM sales WHERE company_id = 1 AND serial_code = 'PD-0001'),
    (SELECT id FROM employees WHERE email = 'facturador1Importadora@gmail.com'),
    'invoice',
    'FE1-1',
    'issued',
    '/uploads/invoices/FE1-1.pdf'
);

-- 19. Ejemplo de Venta a Crédito en etapa Facturación exitosa lista para Despacho (PD-0002 + credit_entries unificado)
INSERT INTO sales (
    company_id, serial_code, customer_id, employee_id, warehouse_id, price_tier,
    payment_method, payment_condition, status, current_stage,
    subtotal, discount_total, iva_total, total, paid_total, sale_at, due_date, notes
)
VALUES (
    1,
    'PD-0002',
    (SELECT id FROM customers WHERE company_id = 1 AND document = '1020304050'),
    (SELECT id FROM employees WHERE email = 'vendedor1Importadora@gmail.com'),
    (SELECT id FROM warehouses WHERE company_id = 1 AND code = 'BOD-01'),
    'p2',
    'credit',
    'credit',
    'open',
    'invoicing_ok',
    106000.00,
    0.00,
    20140.00,
    126140.00,
    0.00,
    CURRENT_TIMESTAMP - INTERVAL '10 minutes',
    CURRENT_DATE + 30,
    'Venta a crédito 30 días con facturación exitosa, pendiente de despacho'
);

INSERT INTO sale_items (
    sale_id, product_id, stock_id, product_code, product_name, price_tier,
    quantity, picked_qty, packed_qty, dispatched_qty,
    unit_price, unit_cost, discount, iva_percent, iva_amount, subtotal, line_total,
    process_stage, stage_status,
    verified_by_employee_id, verified_at,
    picked_by_employee_id, picked_at,
    packed_by_employee_id, packed_at,
    invoiced_by_employee_id, invoiced_at
)
VALUES (
    (SELECT id FROM sales WHERE company_id = 1 AND serial_code = 'PD-0002'),
    (SELECT id FROM products WHERE company_id = 1 AND code = '8801470510011'),
    (SELECT s.id FROM stock s JOIN products p ON p.id = s.product_id JOIN warehouses w ON w.id = s.warehouse_id WHERE p.code = '8801470510011' AND w.code = 'BOD-01'),
    '8801470510011', 'ACEITE KIXX 15W40 1L', 'p2',
    4, 4, 4, 0,
    26500.00, 18000.00, 0.00, 19.00, 20140.00, 106000.00, 126140.00,
    'invoicing_ok', 'completed',
    (SELECT id FROM employees WHERE email = 'facturador1Importadora@gmail.com'), CURRENT_TIMESTAMP - INTERVAL '25 minutes',
    (SELECT id FROM employees WHERE email = 'bodeguero1Importadora@gmail.com'), CURRENT_TIMESTAMP - INTERVAL '20 minutes',
    (SELECT id FROM employees WHERE email = 'bodeguero1Importadora@gmail.com'), CURRENT_TIMESTAMP - INTERVAL '15 minutes',
    (SELECT id FROM employees WHERE email = 'facturador1Importadora@gmail.com'), CURRENT_TIMESTAMP - INTERVAL '10 minutes'
);

-- Asientos lógicos sobre el crédito del cliente (< 0 deuda por venta a crédito, > 0 saldo positivo a favor)
INSERT INTO credit_entries (company_id, customer_id, employee_id, entry_type, amount, sale_id, reason)
VALUES
    (
        1,
        (SELECT id FROM customers WHERE company_id = 1 AND document = '1020304050'),
        (SELECT id FROM employees WHERE email = 'facturador1Importadora@gmail.com'),
        'charge',
        -126140.00,
        (SELECT id FROM sales WHERE company_id = 1 AND serial_code = 'PD-0002'),
        'Cargo a crédito por facturación exitosa de PD-0002'
    ),
    (
        1,
        (SELECT id FROM customers WHERE company_id = 1 AND document = '900123456-7'),
        (SELECT id FROM employees WHERE email = 'cartera1Importadora@gmail.com'),
        'adjust',
        50000.00,
        NULL,
        'Saldo positivo a favor en crédito comercial del cliente'
    );

-- 20. Auditoría inicial de movimientos (audit_movements), logs (audit_logs) y notificación
INSERT INTO audit_movements (
    company_id, stock_id, employee_id, movement_type, quantity, previous_qty, new_qty, reference_type, reference_id, reason
)
VALUES
    (
        1,
        (SELECT s.id FROM stock s JOIN products p ON p.id = s.product_id JOIN warehouses w ON w.id = s.warehouse_id WHERE p.code = '8801470510011' AND w.code = 'BOD-01'),
        (SELECT id FROM employees WHERE email = 'bodeguero1Importadora@gmail.com'),
        'transfer_out', -6, 56, 50, 'transfers',
        (SELECT id FROM transfers WHERE company_id = 1 AND serial_code = 'TR-0001'),
        'Salida por traslado multi-ítem TR-0001 hacia BOD-02'
    ),
    (
        1,
        (SELECT s.id FROM stock s JOIN products p ON p.id = s.product_id JOIN warehouses w ON w.id = s.warehouse_id WHERE p.code = '79191261187' AND w.code = 'BOD-01'),
        (SELECT id FROM employees WHERE email = 'bodeguero1Importadora@gmail.com'),
        'sale_out', -5, 55, 50, 'sales',
        (SELECT id FROM sales WHERE company_id = 1 AND serial_code = 'PD-0001'),
        'Despacho venta completada PD-0001'
    );

INSERT INTO audit_logs (company_id, superadmin_id, entity, entity_id, action, reason, changes)
VALUES (
    1,
    1,
    'companies',
    1,
    'CREATE',
    'Inicialización semilla del esquema V4 final',
    '{"name":"Gestión Importadora Principal","facturation_mode":"warehouse_facturation"}'::jsonb
);

INSERT INTO notifications (employee_id, kind, title, body, entity, entity_id)
VALUES (
    (SELECT id FROM employees WHERE email = 'bodeguero1Importadora@gmail.com'),
    'info',
    'Pedido PD-0002 listo para despacho',
    'El pedido PD-0002 ya cuenta con facturación exitosa y está listo para despacho en BOD-01.',
    'sales',
    (SELECT id FROM sales WHERE company_id = 1 AND serial_code = 'PD-0002')
);

COMMIT;
