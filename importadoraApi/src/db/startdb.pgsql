-- ============================================================
    --IMPORTADORA · DB V10(KIS · English naming)
-- - Superadmin es GLOBAL(company_id = NULL, warehouse_id = NULL)
-- - Audit: 11 módulos × RANGE(occurred_at), particiones on - demand
-- - customer_ref_guard cubre INSERT + UPDATE OF customer_id
-- - BEGIN / COMMIT seguro(todas las DDL son transaccionales)
-- ============================================================
ROLLBACK;
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS citext;

-- ============================================================
    --1. COMPANIES & SECURITY
-- ============================================================
    CREATE TABLE companies(
        id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name         TEXT NOT NULL,
        nit          TEXT NOT NULL UNIQUE,
        legal_name   TEXT,
        email        CITEXT,
        phone        TEXT,
        address      TEXT,
        city         TEXT,
        is_host      BOOLEAN NOT NULL DEFAULT FALSE,
        is_active    BOOLEAN NOT NULL DEFAULT TRUE,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
CREATE UNIQUE INDEX uq_companies_host ON companies(is_host) WHERE is_host;

CREATE TABLE permissions(
        id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        main_module TEXT NOT NULL,
        sub_module  TEXT NOT NULL,
        action      TEXT NOT NULL,
        description TEXT,
        UNIQUE(main_module, sub_module, action)
    );

CREATE TABLE roles(
        id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        company_id  BIGINT NOT NULL REFERENCES companies(id),
        code        TEXT NOT NULL,
        name        TEXT NOT NULL,
        description TEXT,
        is_global   BOOLEAN NOT NULL DEFAULT FALSE,
        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
        UNIQUE(company_id, code)
    );

CREATE TABLE role_permissions(
        role_id       BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        PRIMARY KEY(role_id, permission_id)
    );

CREATE TABLE users(
        id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        uuid          UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        company_id    BIGINT REFERENCES companies(id), --NULLABLE: superadmin es global
  role_id       BIGINT NOT NULL REFERENCES roles(id),
        email         CITEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        full_name     TEXT NOT NULL,
        phone         TEXT,
        user_type     TEXT NOT NULL DEFAULT 'employee' CHECK(user_type = 'employee'),
        document      TEXT,
        area          TEXT,
        job_title     TEXT,
        warehouse_id  BIGINT,
        hired_at      DATE,
        status        TEXT NOT NULL DEFAULT 'active' CHECK(status IN('active', 'inactive', 'blocked')),
        last_login_at TIMESTAMPTZ,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at    TIMESTAMPTZ
    );
CREATE UNIQUE INDEX uq_users_document ON users(company_id, document) WHERE document IS NOT NULL;

CREATE TABLE refresh_tokens(
        id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash   TEXT NOT NULL UNIQUE,
        device       TEXT,
        ip_address   INET,
        expires_at   TIMESTAMPTZ NOT NULL,
        last_used_at TIMESTAMPTZ,
        revoked_at   TIMESTAMPTZ,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE audit_actions(
        code            TEXT PRIMARY KEY,
        entity          TEXT NOT NULL,
        description     TEXT NOT NULL,
        requires_reason BOOLEAN NOT NULL DEFAULT FALSE,
        is_sensitive    BOOLEAN NOT NULL DEFAULT FALSE
    );

-- ============================================================
CREATE TABLE IF NOT EXISTS schema_migrations(
        id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        version           TEXT NOT NULL UNIQUE,
        name              TEXT NOT NULL,
        filename          TEXT NOT NULL,
        checksum          TEXT NOT NULL,
        execution_time_ms INTEGER NOT NULL DEFAULT 0,
        applied_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    --1.b AUDIT: LIST(module_group) + RANGE(occurred_at)
--11 módulos × particiones mensuales on - demand.
-- ⚠️  CRON REQUERIDO: llamar SELECT audit_ensure_partitions(2) cada mes.
-- ============================================================
    CREATE SEQUENCE audit_events_id_seq;

CREATE TABLE audit_events(
        id             BIGINT NOT NULL DEFAULT nextval('audit_events_id_seq'),
        occurred_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        module_group   TEXT NOT NULL DEFAULT 'sistema'
    CHECK(module_group IN('tienda', 'caja', 'cartera', 'inventario', 'usuarios', 'terceros', 'siigo', 'companias', 'reportes', 'auditorias', 'sistema')),
        company_id     BIGINT REFERENCES companies(id),
        user_id        BIGINT REFERENCES users(id),
        user_name      TEXT,
        role_code      TEXT,
        action_code    TEXT NOT NULL,
        entity         TEXT NOT NULL,
        entity_id      BIGINT,
        entity_label   TEXT,
        module         TEXT,
        warehouse_id   BIGINT,
        store_id       BIGINT,
        device         TEXT,
        ip_address     INET,
        reason         TEXT,
        before_data    JSONB,
        after_data     JSONB,
        changed_fields TEXT[],
        request_id     UUID,
        result         TEXT NOT NULL DEFAULT 'success' CHECK(result IN('success', 'denied', 'error')),
        PRIMARY KEY(id, module_group, occurred_at)
    ) PARTITION BY LIST(module_group);

--11 sub - particiones por módulo(cada una RANGE por tiempo)
CREATE TABLE audit_events_tienda      PARTITION OF audit_events FOR VALUES IN('tienda')      PARTITION BY RANGE(occurred_at);
CREATE TABLE audit_events_caja        PARTITION OF audit_events FOR VALUES IN('caja')        PARTITION BY RANGE(occurred_at);
CREATE TABLE audit_events_cartera     PARTITION OF audit_events FOR VALUES IN('cartera')     PARTITION BY RANGE(occurred_at);
CREATE TABLE audit_events_inventario  PARTITION OF audit_events FOR VALUES IN('inventario')  PARTITION BY RANGE(occurred_at);
CREATE TABLE audit_events_usuarios    PARTITION OF audit_events FOR VALUES IN('usuarios')    PARTITION BY RANGE(occurred_at);
CREATE TABLE audit_events_terceros    PARTITION OF audit_events FOR VALUES IN('terceros')    PARTITION BY RANGE(occurred_at);
CREATE TABLE audit_events_siigo       PARTITION OF audit_events FOR VALUES IN('siigo')       PARTITION BY RANGE(occurred_at);
CREATE TABLE audit_events_companias   PARTITION OF audit_events FOR VALUES IN('companias')   PARTITION BY RANGE(occurred_at);
CREATE TABLE audit_events_reportes    PARTITION OF audit_events FOR VALUES IN('reportes')    PARTITION BY RANGE(occurred_at);
CREATE TABLE audit_events_auditorias  PARTITION OF audit_events FOR VALUES IN('auditorias')  PARTITION BY RANGE(occurred_at);
CREATE TABLE audit_events_sistema     PARTITION OF audit_events FOR VALUES IN('sistema')     PARTITION BY RANGE(occurred_at);
CREATE TABLE audit_events_other       PARTITION OF audit_events DEFAULT                       PARTITION BY RANGE(occurred_at);

--Default sub - particiones por módulo(catch-all por tiempo)
CREATE TABLE audit_events_tienda_default     PARTITION OF audit_events_tienda     DEFAULT;
CREATE TABLE audit_events_caja_default       PARTITION OF audit_events_caja       DEFAULT;
CREATE TABLE audit_events_cartera_default    PARTITION OF audit_events_cartera    DEFAULT;
CREATE TABLE audit_events_inventario_default PARTITION OF audit_events_inventario DEFAULT;
CREATE TABLE audit_events_usuarios_default   PARTITION OF audit_events_usuarios   DEFAULT;
CREATE TABLE audit_events_terceros_default   PARTITION OF audit_events_terceros   DEFAULT;
CREATE TABLE audit_events_siigo_default      PARTITION OF audit_events_siigo      DEFAULT;
CREATE TABLE audit_events_companias_default  PARTITION OF audit_events_companias  DEFAULT;
CREATE TABLE audit_events_reportes_default   PARTITION OF audit_events_reportes   DEFAULT;
CREATE TABLE audit_events_auditorias_default PARTITION OF audit_events_auditorias DEFAULT;
CREATE TABLE audit_events_sistema_default    PARTITION OF audit_events_sistema    DEFAULT;
CREATE TABLE audit_events_other_default      PARTITION OF audit_events_other      DEFAULT;

-- ============================================================
    --2. CUSTOMERS & PARTNERS
-- ============================================================
    CREATE TABLE price_levels(
        id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        company_id BIGINT NOT NULL REFERENCES companies(id),
        code       TEXT NOT NULL,
        name       TEXT NOT NULL,
        position   SMALLINT NOT NULL,
        siigo_id   BIGINT,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        UNIQUE(company_id, code),
        UNIQUE(company_id, position)
    );

CREATE TABLE customers(
        id                        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        uuid                      UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        company_id                BIGINT NOT NULL REFERENCES companies(id),
        user_id                   BIGINT UNIQUE REFERENCES users(id),
        is_inline                 BOOLEAN NOT NULL DEFAULT FALSE,
        customer_type             TEXT NOT NULL CHECK(customer_type IN('natural', 'company', 'final_consumer')),
        document_type             TEXT NOT NULL CHECK(document_type IN('CC', 'CE', 'PA', 'TI', 'NIT')),
        document_number           TEXT NOT NULL,
        check_digit               SMALLINT,
        first_name                TEXT,
        last_name                 TEXT,
        business_name             TEXT,
        trade_name                TEXT,
        legal_rep_name            TEXT,
        legal_rep_document_type   TEXT CHECK(legal_rep_document_type IN('CC', 'CE', 'PA')),
        legal_rep_document_number TEXT,
        tax_regime                TEXT NOT NULL DEFAULT 'simplified'
    CHECK(tax_regime IN('simplified', 'common', 'gran_contribuyente', 'autorretenedor', 'responsible_iva', 'non_responsible')),
        economic_activity_code    TEXT,
        email                     CITEXT,
        phone                     TEXT,
        address                   TEXT,
        city                      TEXT,
        department                TEXT,
        country                   TEXT NOT NULL DEFAULT 'Colombia',
        addresses                 JSONB NOT NULL DEFAULT '[]':: jsonb,
        contacts                  JSONB NOT NULL DEFAULT '[]':: jsonb,
        price_level_id            BIGINT NOT NULL REFERENCES price_levels(id),
        credit_enabled            BOOLEAN NOT NULL DEFAULT FALSE,
        credit_limit              NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK(credit_limit >= 0),
        status                    TEXT NOT NULL DEFAULT 'active' CHECK(status IN('active', 'inactive', 'overdue')),
        siigo_id                  TEXT,
        display_name              TEXT GENERATED ALWAYS AS(
            COALESCE(business_name, NULLIF(TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')), ''), 'Consumidor Final')
        ) STORED,
        created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at                TIMESTAMPTZ,
        UNIQUE(company_id, document_type, document_number, is_inline),
        CHECK(
            (customer_type = 'final_consumer' AND document_type = 'NIT' AND document_number = '222222222222')
    OR(customer_type = 'natural' AND first_name IS NOT NULL AND last_name IS NOT NULL)
    OR(customer_type = 'company' AND business_name IS NOT NULL
        AND legal_rep_name IS NOT NULL AND legal_rep_document_number IS NOT NULL)
    ),
    CHECK(
        (customer_type = 'final_consumer' AND document_type = 'NIT')
OR(customer_type = 'natural' AND document_type IN('CC', 'CE', 'PA', 'TI', 'NIT'))
OR(customer_type = 'company' AND document_type = 'NIT')
  ),
CHECK(document_type <> 'NIT' OR check_digit IS NOT NULL),
    CHECK(customer_type <> 'final_consumer' OR credit_enabled = FALSE),
    CHECK(NOT is_inline OR customer_type = 'final_consumer')
);
CREATE UNIQUE INDEX uq_customers_inline ON customers(company_id) WHERE is_inline;
CREATE INDEX idx_customers_type    ON customers(company_id, customer_type, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_display ON customers USING gin(display_name gin_trgm_ops);

CREATE TABLE partners(
        id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        company_id BIGINT NOT NULL REFERENCES companies(id),
        kind       TEXT NOT NULL CHECK(kind IN('supplier', 'carrier', 'other')),
        category   TEXT,
        nit        TEXT,
        name       TEXT NOT NULL,
        contact    TEXT,
        phone      TEXT,
        email      CITEXT,
        city       TEXT,
        terms_days SMALLINT NOT NULL DEFAULT 0,
        coverage   TEXT,
        siigo_id   TEXT,
        is_active  BOOLEAN NOT NULL DEFAULT TRUE,
        UNIQUE(company_id, kind, name)
    );
CREATE UNIQUE INDEX uq_partners_nit ON partners(company_id, kind, nit) WHERE nit IS NOT NULL;

-- ============================================================
    --3. CATALOG
-- ============================================================
    CREATE TABLE brands(
        id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name      TEXT NOT NULL UNIQUE,
        image_url TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE
    );

CREATE TABLE company_brands(
        company_id BIGINT NOT NULL REFERENCES companies(id),
        brand_id   BIGINT NOT NULL REFERENCES brands(id),
        is_active  BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY(company_id, brand_id)
    );

CREATE TABLE models(
        id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        company_id BIGINT NOT NULL REFERENCES companies(id),
        name       TEXT NOT NULL,
        is_active  BOOLEAN NOT NULL DEFAULT TRUE,
        UNIQUE(company_id, name)
    );

CREATE TABLE categories(
        id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        company_id     BIGINT NOT NULL REFERENCES companies(id),
        parent_id      BIGINT REFERENCES categories(id),
        name           TEXT NOT NULL,
        siigo_group_id BIGINT,
        is_active      BOOLEAN NOT NULL DEFAULT TRUE,
        UNIQUE(company_id, parent_id, name)
    );

CREATE TABLE products(
        id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        uuid          UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        company_id    BIGINT NOT NULL REFERENCES companies(id),
        brand_id      BIGINT REFERENCES brands(id),
        category_id   BIGINT REFERENCES categories(id),
        model_id      BIGINT REFERENCES models(id),
        code          TEXT NOT NULL CHECK(length(trim(code)) > 0),
        name          TEXT NOT NULL,
        description   TEXT,
        is_promotion  BOOLEAN NOT NULL DEFAULT FALSE,
        unit          TEXT NOT NULL DEFAULT 'UND',
        tax_percent   NUMERIC(5, 2) NOT NULL DEFAULT 19 CHECK(tax_percent >= 0),
        images        TEXT[] NOT NULL DEFAULT '{}',
        qr_payload    TEXT,
        siigo_id      TEXT,
        status        TEXT NOT NULL DEFAULT 'active' CHECK(status IN('draft', 'active', 'inactive', 'discontinued')),
        search_text   TEXT,
        virtual_stock INTEGER NOT NULL DEFAULT 0 CHECK(virtual_stock >= 0),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at    TIMESTAMPTZ,
        UNIQUE(company_id, code)
    );

CREATE TABLE product_codes(
        id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        company_id BIGINT NOT NULL REFERENCES companies(id),
        product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        code_type  TEXT NOT NULL CHECK(code_type IN('sku', 'reference', 'barcode', 'supplier', 'oem')),
        code       TEXT NOT NULL CHECK(length(trim(code)) > 0),
        UNIQUE(company_id, code_type, code)
    );

CREATE TABLE product_prices(
        id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        product_id     BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        price_level_id BIGINT NOT NULL REFERENCES price_levels(id),
        amount         NUMERIC(14, 2) NOT NULL CHECK(amount >= 0),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(product_id, price_level_id)
    );

CREATE TABLE product_suppliers(
        product_id    BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        supplier_id   BIGINT NOT NULL REFERENCES partners(id),
        cost          NUMERIC(14, 2) NOT NULL CHECK(cost >= 0),
        supplier_code TEXT,
        PRIMARY KEY(product_id, supplier_id)
    );

CREATE TABLE customer_discounts(
        id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        scope       TEXT NOT NULL CHECK(scope IN('all', 'brand', 'category', 'product')),
        brand_id    BIGINT REFERENCES brands(id),
        category_id BIGINT REFERENCES categories(id),
        product_id  BIGINT REFERENCES products(id),
        percent     NUMERIC(5, 2) NOT NULL CHECK(percent > 0 AND percent <= 100),
        is_active   BOOLEAN NOT NULL DEFAULT TRUE
    );

-- ============================================================
    --4. INVENTORY
-- ============================================================
    CREATE TABLE warehouses(
        id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        company_id BIGINT NOT NULL REFERENCES companies(id),
        code       TEXT NOT NULL,
        name       TEXT NOT NULL,
        city       TEXT,
        address    TEXT,
        siigo_id   BIGINT,
        is_active  BOOLEAN NOT NULL DEFAULT TRUE,
        UNIQUE(company_id, code)
    );

ALTER TABLE users ADD CONSTRAINT users_warehouse_fk FOREIGN KEY(warehouse_id) REFERENCES warehouses(id);

CREATE TABLE stock(
        id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        product_id   BIGINT NOT NULL REFERENCES products(id),
        warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
        location     TEXT NOT NULL DEFAULT '',
        available    INTEGER NOT NULL DEFAULT 0 CHECK(available >= 0),
        in_cart      INTEGER NOT NULL DEFAULT 0 CHECK(in_cart >= 0),
        reserved     INTEGER NOT NULL DEFAULT 0 CHECK(reserved >= 0),
        min_stock    INTEGER NOT NULL DEFAULT 0,
        max_stock    INTEGER,
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(product_id, warehouse_id, location),
        CHECK(in_cart + reserved <= available)
    );

CREATE TABLE stores(
        id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        company_id BIGINT NOT NULL REFERENCES companies(id),
        code       TEXT NOT NULL,
        name       TEXT NOT NULL,
        store_type TEXT NOT NULL CHECK(store_type IN('physical', 'online', 'corporate')),
        is_active  BOOLEAN NOT NULL DEFAULT TRUE,
        UNIQUE(company_id, code)
    );

CREATE TABLE store_warehouses(
        store_id     BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
        priority     SMALLINT NOT NULL DEFAULT 1,
        PRIMARY KEY(store_id, warehouse_id)
    );

CREATE TABLE stock_shares(
        id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        owner_company_id    BIGINT NOT NULL REFERENCES companies(id),
        borrower_company_id BIGINT NOT NULL REFERENCES companies(id),
        stock_id            BIGINT NOT NULL REFERENCES stock(id),
        borrower_product_id BIGINT NOT NULL REFERENCES products(id),
        qty_authorized      INTEGER NOT NULL CHECK(qty_authorized > 0),
        qty_used            INTEGER NOT NULL DEFAULT 0 CHECK(qty_used >= 0),
        status              TEXT NOT NULL DEFAULT 'active' CHECK(status IN('active', 'closed')),
        created_by          BIGINT REFERENCES users(id),
        created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        closed_at           TIMESTAMPTZ,
        UNIQUE(stock_id, borrower_product_id),
        CHECK(owner_company_id <> borrower_company_id),
        CHECK(qty_used <= qty_authorized)
    );

CREATE TABLE stock_movements(
        id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        stock_id      BIGINT NOT NULL REFERENCES stock(id),
        movement_type TEXT NOT NULL CHECK(movement_type IN
            ('purchase_in', 'sale_out', 'transfer_out', 'transfer_in', 'adjustment', 'return_in', 'count_adjust')),
        quantity      INTEGER NOT NULL CHECK(quantity <> 0),
        document_type TEXT,
        document_id   BIGINT,
        created_by    BIGINT REFERENCES users(id),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE stock_counts(
        id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        company_id   BIGINT NOT NULL REFERENCES companies(id),
        warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
        status       TEXT NOT NULL DEFAULT 'pending' CHECK(status IN('pending', 'verified', 'corroborated')),
        created_by   BIGINT REFERENCES users(id),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        closed_at    TIMESTAMPTZ
    );

CREATE TABLE stock_count_items(
        id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        count_id     BIGINT NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
        stock_id     BIGINT NOT NULL REFERENCES stock(id),
        expected_qty INTEGER NOT NULL,
        counted_qty  INTEGER,
        counted_by   BIGINT REFERENCES users(id),
        UNIQUE(count_id, stock_id)
    );

-- ============================================================
    --5. SALES
-- ============================================================
    CREATE TABLE sales(
        id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        uuid              UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        company_id        BIGINT NOT NULL REFERENCES companies(id),
        serial_code       TEXT NOT NULL,
        sale_type         TEXT NOT NULL DEFAULT 'sale' CHECK(sale_type IN('sale', 'transfer')),
        customer_id       BIGINT REFERENCES customers(id),
        seller_id         BIGINT REFERENCES users(id),
        warehouse_id      BIGINT NOT NULL REFERENCES warehouses(id),
        store_id          BIGINT REFERENCES stores(id),
        aux_warehouse_id  BIGINT REFERENCES warehouses(id),
        price_level_id    BIGINT REFERENCES price_levels(id),
        payment_method    TEXT CHECK(payment_method IN('cash', 'transfer', 'credit', 'favor')),
        immediate_picking BOOLEAN NOT NULL DEFAULT FALSE,
        status            TEXT NOT NULL DEFAULT 'open' CHECK(status IN('open', 'completed', 'cancelled')),
        current_stage     TEXT,
        stage_state       TEXT,
        subtotal          NUMERIC(14, 2) NOT NULL DEFAULT 0,
        discount_total    NUMERIC(14, 2) NOT NULL DEFAULT 0,
        tax_total         NUMERIC(14, 2) NOT NULL DEFAULT 0,
        total             NUMERIC(14, 2) NOT NULL DEFAULT 0,
        paid_total        NUMERIC(14, 2) NOT NULL DEFAULT 0,
        payment_condition TEXT CHECK(payment_condition IN('cash', 'credit')),
        sale_at           TIMESTAMPTZ,
        carrier_id        BIGINT REFERENCES partners(id),
        tracking_no       TEXT,
        dispatched_at     TIMESTAMPTZ,
        received_at       TIMESTAMPTZ,
        cancel_reason     TEXT,
        cancelled_by      BIGINT REFERENCES users(id),
        notes             TEXT,
        created_by        BIGINT REFERENCES users(id),
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(company_id, serial_code),
        CHECK(sale_type <> 'transfer' OR aux_warehouse_id IS NOT NULL),
        CHECK(sale_type = 'transfer' OR payment_method IS NOT NULL),
        CHECK(status <> 'cancelled' OR length(trim(coalesce(cancel_reason, ''))) > 0),
        CHECK(sale_at IS NULL OR payment_condition IS NOT NULL)
    );

CREATE TABLE sale_items(
        id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        sale_id          BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        product_id       BIGINT NOT NULL REFERENCES products(id),
        stock_id         BIGINT NOT NULL REFERENCES stock(id),
        stock_company_id BIGINT REFERENCES companies(id),
        quantity         INTEGER NOT NULL CHECK(quantity > 0),
        picked_qty       INTEGER NOT NULL DEFAULT 0,
        packed_qty       INTEGER NOT NULL DEFAULT 0,
        unit_price       NUMERIC(14, 2) NOT NULL CHECK(unit_price >= 0),
        discount         NUMERIC(14, 2) NOT NULL DEFAULT 0,
        tax_percent      NUMERIC(5, 2) NOT NULL DEFAULT 0,
        line_total       NUMERIC(14, 2) NOT NULL DEFAULT 0,
        CHECK(picked_qty BETWEEN 0 AND quantity),
        CHECK(packed_qty BETWEEN 0 AND picked_qty)
    );

CREATE TABLE sale_stages(
        id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        sale_id      BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        stage        TEXT NOT NULL CHECK(stage IN('verification', 'invoicing', 'picking', 'packing', 'shipping', 'delivery')),
        position     SMALLINT NOT NULL,
        status       TEXT NOT NULL DEFAULT 'available' CHECK(status IN('available', 'occupied', 'paused', 'completed', 'verified')),
        assigned_to  BIGINT REFERENCES users(id),
        started_at   TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        verified_by  BIGINT REFERENCES users(id),
        verified_at  TIMESTAMPTZ,
        note         TEXT,
        UNIQUE(sale_id, stage),
        CHECK(status NOT IN('occupied', 'paused') OR assigned_to IS NOT NULL),
        CHECK(status <> 'completed' OR completed_at IS NOT NULL),
        CHECK(status <> 'verified' OR(verified_by IS NOT NULL AND verified_at IS NOT NULL))
    );

CREATE TABLE carts(
        id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        uuid           UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        company_id     BIGINT NOT NULL REFERENCES companies(id),
        user_id        BIGINT REFERENCES users(id),
        customer_id    BIGINT REFERENCES customers(id),
        warehouse_id   BIGINT REFERENCES warehouses(id),
        price_level_id BIGINT REFERENCES price_levels(id),
        status         TEXT NOT NULL DEFAULT 'open' CHECK(status IN('open', 'converted', 'abandoned')),
        expires_at     TIMESTAMPTZ NOT NULL DEFAULT now() + interval '1 hour',
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE cart_items(
        id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        cart_id    BIGINT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
        product_id BIGINT NOT NULL REFERENCES products(id),
        stock_id   BIGINT NOT NULL REFERENCES stock(id),
        quantity   INTEGER NOT NULL CHECK(quantity > 0),
        UNIQUE(cart_id, stock_id)
    );

CREATE TABLE quotations(
        id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        company_id  BIGINT NOT NULL REFERENCES companies(id),
        serial_code TEXT NOT NULL,
        customer_id BIGINT NOT NULL REFERENCES customers(id),
        seller_id   BIGINT REFERENCES users(id),
        cart_id     BIGINT REFERENCES carts(id),
        status      TEXT NOT NULL DEFAULT 'draft' CHECK(status IN('draft', 'sent', 'accepted', 'expired', 'converted')),
        valid_until DATE,
        total       NUMERIC(14, 2) NOT NULL DEFAULT 0,
        sale_id     BIGINT REFERENCES sales(id),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(company_id, serial_code)
    );

CREATE TABLE quotation_items(
        id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        quotation_id BIGINT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
        product_id   BIGINT NOT NULL REFERENCES products(id),
        quantity     INTEGER NOT NULL CHECK(quantity > 0),
        unit_price   NUMERIC(14, 2) NOT NULL
    );

CREATE TABLE returns(
        id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        company_id  BIGINT NOT NULL REFERENCES companies(id),
        sale_id     BIGINT NOT NULL REFERENCES sales(id),
        customer_id BIGINT NOT NULL REFERENCES customers(id),
        reason      TEXT NOT NULL CHECK(length(trim(reason)) > 0),
        status      TEXT NOT NULL DEFAULT 'pending' CHECK(status IN('pending', 'approved', 'rejected')),
        resolution  TEXT NOT NULL DEFAULT 'credit_in_favor' CHECK(resolution = 'credit_in_favor'),
        total       NUMERIC(14, 2) NOT NULL CHECK(total > 0),
        approved_by BIGINT REFERENCES users(id),
        approved_at TIMESTAMPTZ,
        created_by  BIGINT REFERENCES users(id),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK(status <> 'approved' OR(approved_by IS NOT NULL AND approved_at IS NOT NULL))
    );

CREATE TABLE return_items(
        id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        return_id    BIGINT NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
        sale_item_id BIGINT NOT NULL REFERENCES sale_items(id),
        quantity     INTEGER NOT NULL CHECK(quantity > 0),
        restock      BOOLEAN NOT NULL DEFAULT TRUE
    );

-- ============================================================
    --6. MONEY & PURCHASES
-- ============================================================
    CREATE TABLE payments(
        id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        company_id   BIGINT NOT NULL REFERENCES companies(id),
        sale_id      BIGINT NOT NULL REFERENCES sales(id),
        customer_id  BIGINT REFERENCES customers(id),
        method       TEXT NOT NULL CHECK(method IN('cash', 'transfer', 'favor')),
        amount       NUMERIC(14, 2) NOT NULL CHECK(amount > 0),
        status       TEXT NOT NULL DEFAULT 'review' CHECK(status IN('review', 'verified', 'issue', 'voided')),
        proof_url    TEXT,
        reference    TEXT,
        issue_note   TEXT,
        void_reason  TEXT,
        verified_by  BIGINT REFERENCES users(id),
        verified_at  TIMESTAMPTZ,
        created_by   BIGINT REFERENCES users(id),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK(status <> 'voided'   OR length(trim(coalesce(void_reason, ''))) > 0),
        CHECK(status <> 'issue'    OR length(trim(coalesce(issue_note, ''))) > 0),
        CHECK(status <> 'verified' OR(verified_by IS NOT NULL AND verified_at IS NOT NULL))
    );

CREATE TABLE credit_entries(
        id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        company_id  BIGINT NOT NULL REFERENCES companies(id),
        customer_id BIGINT NOT NULL REFERENCES customers(id),
        bucket      TEXT NOT NULL CHECK(bucket IN('pending', 'in_favor')),
        entry_type  TEXT NOT NULL CHECK(entry_type IN('charge', 'payment', 'issue', 'apply', 'adjust')),
        amount      NUMERIC(14, 2) NOT NULL CHECK(amount <> 0),
        sale_id     BIGINT REFERENCES sales(id),
        payment_id  BIGINT REFERENCES payments(id),
        return_id   BIGINT REFERENCES returns(id),
        reason      TEXT,
        created_by  BIGINT REFERENCES users(id),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK((bucket = 'pending'  AND entry_type IN('charge', 'payment', 'adjust'))
      OR(bucket = 'in_favor' AND entry_type IN('issue', 'apply', 'adjust')))
);

CREATE TABLE purchases(
            id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            company_id   BIGINT NOT NULL REFERENCES companies(id),
            serial_code  TEXT NOT NULL,
            supplier_id  BIGINT NOT NULL REFERENCES partners(id),
            warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
            status       TEXT NOT NULL DEFAULT 'draft' CHECK(status IN('draft', 'ordered', 'received', 'voided')),
            total        NUMERIC(14, 2) NOT NULL DEFAULT 0,
            approved_by  BIGINT REFERENCES users(id),
            approved_at  TIMESTAMPTZ,
            received_by  BIGINT REFERENCES users(id),
            received_at  TIMESTAMPTZ,
            void_reason  TEXT,
            created_by   BIGINT REFERENCES users(id),
            created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE(company_id, serial_code),
            CHECK(status <> 'voided' OR length(trim(coalesce(void_reason, ''))) > 0)
        );

CREATE TABLE purchase_items(
            id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            purchase_id BIGINT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
            product_id  BIGINT NOT NULL REFERENCES products(id),
            quantity    INTEGER NOT NULL CHECK(quantity > 0),
            unit_cost   NUMERIC(14, 2) NOT NULL
        );

CREATE TABLE invoices(
            id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            company_id  BIGINT NOT NULL REFERENCES companies(id),
            sale_id     BIGINT NOT NULL UNIQUE REFERENCES sales(id),
            number      TEXT,
            siigo_id    TEXT,
            dian_status TEXT NOT NULL DEFAULT 'pending' CHECK(dian_status IN('pending', 'accepted', 'rejected', 'annulled')),
            cufe        TEXT,
            dian_errors JSONB,
            pdf_url     TEXT,
            xml_url     TEXT,
            issued_at   TIMESTAMPTZ
        );

-- ============================================================
    --7. CASH
-- ============================================================
    CREATE TABLE cash_registers(
        id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        company_id   BIGINT NOT NULL REFERENCES companies(id),
        code         TEXT NOT NULL,
        name         TEXT NOT NULL,
        warehouse_id BIGINT REFERENCES warehouses(id),
        is_active    BOOLEAN NOT NULL DEFAULT TRUE,
        UNIQUE(company_id, code)
    );

CREATE TABLE cash_sessions(
        id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        company_id       BIGINT NOT NULL REFERENCES companies(id),
        cash_register_id BIGINT NOT NULL REFERENCES cash_registers(id),
        opened_by        BIGINT NOT NULL REFERENCES users(id),
        opened_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        closed_by        BIGINT REFERENCES users(id),
        closed_at        TIMESTAMPTZ,
        opening_amount   NUMERIC(14, 2) NOT NULL DEFAULT 0,
        closing_amount   NUMERIC(14, 2),
        status           TEXT NOT NULL DEFAULT 'open' CHECK(status IN('open', 'closed')),
        notes            TEXT
    );

CREATE TABLE cash_movements(
        id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        cash_session_id BIGINT NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,
        movement_type   TEXT NOT NULL CHECK(movement_type IN('sale', 'payment', 'withdrawal', 'deposit', 'adjustment', 'expense')),
        amount          NUMERIC(14, 2) NOT NULL CHECK(amount <> 0),
        payment_id      BIGINT REFERENCES payments(id),
        sale_id         BIGINT REFERENCES sales(id),
        description     TEXT,
        created_by      BIGINT NOT NULL REFERENCES users(id),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE cash_closures(
        id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        cash_session_id BIGINT NOT NULL UNIQUE REFERENCES cash_sessions(id) ON DELETE CASCADE,
        total_sales     NUMERIC(14, 2) NOT NULL DEFAULT 0,
        total_payments  NUMERIC(14, 2) NOT NULL DEFAULT 0,
        total_expenses  NUMERIC(14, 2) NOT NULL DEFAULT 0,
        expected_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
        counted_amount  NUMERIC(14, 2) NOT NULL DEFAULT 0,
        difference      NUMERIC(14, 2) GENERATED ALWAYS AS(counted_amount - expected_amount) STORED,
        closed_by       BIGINT NOT NULL REFERENCES users(id),
        closed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        notes           TEXT
    );

-- ============================================================
    --8. REALTIME & INTEGRATION
-- ============================================================
    CREATE TABLE realtime_events(
        id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        company_id   BIGINT NOT NULL REFERENCES companies(id),
        warehouse_id BIGINT,
        user_id      BIGINT,
        channel      TEXT NOT NULL CHECK(channel IN('stock', 'orders', 'transfers', 'payments', 'credit', 'returns', 'notifications', 'purchases')),
        event_type   TEXT NOT NULL,
        entity       TEXT NOT NULL,
        entity_id    BIGINT,
        payload      JSONB NOT NULL DEFAULT '{}':: jsonb,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE notifications(
        id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title      TEXT NOT NULL,
        body       TEXT,
        read_at    TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE siigo_credentials(
        company_id       BIGINT PRIMARY KEY REFERENCES companies(id),
        username         TEXT NOT NULL,
        access_key_enc   BYTEA NOT NULL,
        partner_id       TEXT NOT NULL,
        environment      TEXT NOT NULL DEFAULT 'test' CHECK(environment IN('test', 'production')),
        settings         JSONB NOT NULL DEFAULT '{}':: jsonb,
        token_expires_at TIMESTAMPTZ
    );

CREATE TABLE siigo_outbox(
        id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        company_id      BIGINT NOT NULL REFERENCES companies(id),
        entity          TEXT NOT NULL,
        entity_id       BIGINT NOT NULL,
        operation       TEXT NOT NULL,
        idempotency_key UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        payload         JSONB NOT NULL,
        status          TEXT NOT NULL DEFAULT 'pending' CHECK(status IN('pending', 'sent', 'failed')),
        attempts        SMALLINT NOT NULL DEFAULT 0,
        last_error      TEXT,
        next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );

-- ============================================================
    --9. INDEXES
-- ============================================================
    CREATE INDEX idx_products_code_trgm    ON products USING gin(code gin_trgm_ops);
CREATE INDEX idx_products_search       ON products USING gin(search_text gin_trgm_ops);
CREATE INDEX idx_products_company      ON products(company_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_product_codes_trgm    ON product_codes USING gin(code gin_trgm_ops);
CREATE INDEX idx_users_name_trgm       ON users USING gin(full_name gin_trgm_ops);
CREATE INDEX idx_stock_product         ON stock(product_id);
CREATE INDEX idx_stock_warehouse       ON stock(warehouse_id, location);
CREATE INDEX idx_sales_company_status  ON sales(company_id, status, current_stage, created_at DESC);
CREATE INDEX idx_sales_customer        ON sales(customer_id, created_at DESC);
CREATE INDEX idx_sale_items_sale       ON sale_items(sale_id);
CREATE INDEX idx_sale_stages_queue     ON sale_stages(stage, status) WHERE status IN('available', 'occupied', 'paused');
CREATE INDEX idx_sale_stages_sale      ON sale_stages(sale_id, position);
CREATE INDEX idx_cart_items_cart       ON cart_items(cart_id);
CREATE INDEX idx_carts_expire          ON carts(expires_at) WHERE status = 'open';
CREATE INDEX idx_stock_mov_stock       ON stock_movements(stock_id, created_at DESC);
CREATE INDEX idx_stock_shares_borrower ON stock_shares(borrower_company_id, stock_id) WHERE status = 'active';
CREATE INDEX idx_payments_sale         ON payments(sale_id);
CREATE INDEX idx_payments_review       ON payments(company_id, created_at) WHERE status IN('review', 'issue');
CREATE INDEX idx_credit_customer       ON credit_entries(customer_id, bucket);
CREATE UNIQUE INDEX uq_credit_return_issue ON credit_entries(return_id) WHERE entry_type = 'issue';
CREATE INDEX idx_rt_events_cursor      ON realtime_events(company_id, id);
CREATE INDEX idx_rt_events_created     ON realtime_events(created_at);
CREATE INDEX idx_audit_entity          ON audit_events(company_id, entity, entity_id, occurred_at DESC);
CREATE INDEX idx_audit_user            ON audit_events(company_id, user_id, occurred_at DESC);
CREATE INDEX idx_audit_action          ON audit_events(company_id, action_code, occurred_at DESC);
CREATE INDEX idx_audit_module_time     ON audit_events(module_group, occurred_at DESC);
CREATE INDEX idx_outbox_pending        ON siigo_outbox(next_attempt_at) WHERE status = 'pending';
CREATE INDEX idx_sales_created_at      ON sales(company_id, created_at);
CREATE INDEX idx_sales_sale_at         ON sales(company_id, sale_at);
CREATE INDEX idx_payments_created_at   ON payments(company_id, created_at);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX idx_purchases_company_status ON purchases(company_id, status, created_at DESC);

-- ============================================================
    --10. SEED · PERMISSIONS CATALOG
-- ============================================================
    INSERT INTO permissions(main_module, sub_module, action, description) VALUES
        ('tienda', 'catalogo', 'view', 'Ver catálogo'),
        ('tienda', 'pedidos', 'view', 'Ver pedidos'),
        ('tienda', 'pedidos', 'create', 'Crear pedidos'),
        ('tienda', 'pedidos', 'edit', 'Editar pedidos'),
        ('tienda', 'pedidos', 'cancel', 'Cancelar pedidos'),
        ('tienda', 'pedidos', 'take_verification', 'Tomar verificación'),
        ('tienda', 'pedidos', 'take_invoicing', 'Tomar facturación'),
        ('tienda', 'pedidos', 'take_picking', 'Tomar picking'),
        ('tienda', 'pedidos', 'take_packing', 'Tomar packing'),
        ('tienda', 'pedidos', 'take_shipping', 'Tomar envío'),
        ('tienda', 'pedidos', 'take_delivery', 'Tomar entrega'),
        ('tienda', 'historial_pedidos', 'view', 'Ver historial'),
        ('tienda', 'cotizaciones', 'manage', 'Gestionar cotizaciones'),
        ('caja', 'caja', 'operate', 'Operar caja'),
        ('caja', 'caja', 'close', 'Cerrar caja'),
        ('caja', 'facturacion', 'billing', 'Facturar'),
        ('cartera', 'creditos', 'manage', 'Gestionar créditos'),
        ('cartera', 'abonos', 'manage', 'Registrar abonos'),
        ('cartera', 'verificacion_abonos', 'verify', 'Verificar abonos'),
        ('cartera', 'historial_recaudos', 'view', 'Ver historial de recaudos'),
        ('inventario', 'productos', 'view', 'Ver productos'),
        ('inventario', 'productos', 'manage', 'Gestionar productos'),
        ('inventario', 'marcas_categorias_modelos', 'view', 'Ver catálogos'),
        ('inventario', 'marcas_categorias_modelos', 'manage', 'Gestionar catálogos'),
        ('inventario', 'ordenes_compra', 'view', 'Ver órdenes de compra'),
        ('inventario', 'ordenes_compra', 'manage', 'Gestionar órdenes de compra'),
        ('inventario', 'entradas_compra', 'view', 'Ver entradas de compra'),
        ('inventario', 'entradas_compra', 'manage', 'Gestionar entradas (recibir)'),
        ('inventario', 'existencias', 'view', 'Ver existencias'),
        ('inventario', 'traslados', 'view', 'Ver traslados'),
        ('inventario', 'traslados', 'manage', 'Gestionar traslados'),
        ('inventario', 'devoluciones', 'view', 'Ver devoluciones'),
        ('inventario', 'devoluciones', 'manage', 'Gestionar devoluciones'),
        ('inventario', 'conteos', 'view', 'Ver conteos'),
        ('inventario', 'conteos', 'manage', 'Gestionar conteos'),
        ('inventario', 'tiendas_stock_virtual', 'view', 'Ver tiendas/stock virtual'),
        ('inventario', 'tiendas_stock_virtual', 'manage', 'Gestionar tiendas/stock virtual'),
        ('usuarios', 'clientes', 'view', 'Ver clientes'),
        ('usuarios', 'clientes', 'manage', 'Gestionar clientes'),
        ('usuarios', 'empleados', 'view', 'Ver empleados'),
        ('usuarios', 'empleados', 'manage', 'Gestionar empleados'),
        ('usuarios', 'roles_permisos', 'view', 'Ver roles y permisos'),
        ('usuarios', 'roles_permisos', 'manage', 'Gestionar roles y permisos'),
        ('terceros', 'proveedores', 'view', 'Ver proveedores'),
        ('terceros', 'proveedores', 'manage', 'Gestionar proveedores'),
        ('terceros', 'transportadoras', 'view', 'Ver transportadoras'),
        ('terceros', 'transportadoras', 'manage', 'Gestionar transportadoras'),
        ('reportes', 'ventas_diarias', 'view', 'Ver ventas diarias'),
        ('reportes', 'reporte_general', 'view', 'Ver reporte general'),
        ('reportes', 'valoracion_inventario', 'view', 'Ver valoración'),
        ('siigo', 'integracion', 'view', 'Ver SIIGO'),
        ('siigo', 'integracion', 'manage', 'Gestionar SIIGO'),
        ('companias', 'gestion', 'view', 'Ver compañías'),
        ('companias', 'gestion', 'manage', 'Gestionar compañías'),
        ('auditorias', 'movimientos', 'view', 'Ver movimientos'),
        ('auditorias', 'cambios_modelo', 'view', 'Ver cambios por modelo'),
        ('auditorias', 'accesos_sesiones', 'view', 'Ver accesos y sesiones');

-- ============================================================
    --11. SEED · COMPANIES, ROLES, PERMISSIONS ASSIGNMENT
-- ============================================================
    --Company 1(host)
INSERT INTO companies(name, nit, is_host) VALUES('Gestión Importadora', '900000001-1', TRUE);

--Roles company 1
INSERT INTO roles(company_id, code, name, is_global) VALUES
    (1, 'superadmin', 'Superadministrador', TRUE);
INSERT INTO roles(company_id, code, name) VALUES
    (1, 'admin', 'Administrador'),
    (1, 'vendedor', 'Vendedor'),
    (1, 'bodeguero', 'Bodeguero'),
    (1, 'cajero', 'Cajero'),
    (1, 'repartidor', 'Repartidor'),
    (1, 'administrativo', 'Administrativo'),
    (1, 'cliente', 'Cliente');

--Price levels company 1
INSERT INTO price_levels(company_id, code, name, position, is_default) VALUES
    (1, 'P0', 'Mostrador', 0, TRUE), (1, 'P1', 'Taller', 1, FALSE),
    (1, 'P2', 'Distribuidor', 2, FALSE), (1, 'P3', 'Mayorista', 3, FALSE);

--role_permissions company 1
INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.code = 'superadmin' AND r.company_id = 1;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.code = 'admin' AND r.company_id = 1 AND p.main_module <> 'companias';

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON(
    (p.main_module = 'tienda' AND p.sub_module = 'catalogo' AND p.action = 'view') OR
        (p.main_module = 'tienda' AND p.sub_module = 'pedidos' AND p.action IN
            ('view', 'create', 'edit', 'cancel', 'take_verification')) OR
                (p.main_module = 'tienda' AND p.sub_module = 'historial_pedidos' AND p.action = 'view') OR
                    (p.main_module = 'tienda' AND p.sub_module = 'cotizaciones' AND p.action = 'manage') OR
                        (p.main_module = 'inventario' AND p.sub_module = 'productos' AND p.action = 'view') OR
                            (p.main_module = 'inventario' AND p.sub_module = 'existencias' AND p.action = 'view') OR
                                (p.main_module = 'usuarios' AND p.sub_module = 'clientes' AND p.action = 'view')
) WHERE r.code = 'vendedor' AND r.company_id = 1;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON(
                                    (p.main_module = 'tienda' AND p.sub_module = 'pedidos' AND p.action IN
                                    ('view', 'take_picking', 'take_packing')) OR
                                        (p.main_module = 'inventario' AND p.sub_module = 'productos' AND p.action = 'view') OR
                                            (p.main_module = 'inventario' AND p.sub_module = 'existencias' AND p.action = 'view') OR
                                                (p.main_module = 'inventario' AND p.sub_module = 'conteos' AND p.action IN('view', 'manage')) OR
                                                    (p.main_module = 'inventario' AND p.sub_module = 'traslados' AND p.action IN('view', 'manage')) OR
                                                        (p.main_module = 'inventario' AND p.sub_module = 'devoluciones' AND p.action IN('view', 'manage')) OR
                                                            (p.main_module = 'inventario' AND p.sub_module = 'tiendas_stock_virtual' AND p.action = 'view')
) WHERE r.code = 'bodeguero' AND r.company_id = 1;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON(
                                                                (p.main_module = 'tienda' AND p.sub_module = 'pedidos' AND p.action IN('view', 'take_invoicing')) OR
                                                                    (p.main_module = 'caja' AND p.sub_module = 'caja' AND p.action IN('operate', 'close')) OR
                                                                        (p.main_module = 'caja' AND p.sub_module = 'facturacion' AND p.action = 'billing') OR
                                                                            (p.main_module = 'cartera' AND p.sub_module = 'abonos' AND p.action = 'manage') OR
                                                                                (p.main_module = 'cartera' AND p.sub_module = 'verificacion_abonos' AND p.action = 'verify')
) WHERE r.code = 'cajero' AND r.company_id = 1;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON(
                                                                                    (p.main_module = 'tienda' AND p.sub_module = 'pedidos' AND p.action IN
                                                                                    ('view', 'take_shipping', 'take_delivery')) OR
                                                                                        (p.main_module = 'terceros' AND p.sub_module = 'transportadoras' AND p.action = 'view')
) WHERE r.code = 'repartidor' AND r.company_id = 1;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON(
                                                                                            (p.main_module = 'inventario' AND p.sub_module = 'ordenes_compra' AND p.action IN('view', 'manage')) OR
                                                                                                (p.main_module = 'inventario' AND p.sub_module = 'entradas_compra' AND p.action IN('view', 'manage')) OR
                                                                                                    (p.main_module = 'terceros' AND p.sub_module = 'proveedores' AND p.action IN('view', 'manage')) OR
                                                                                                        (p.main_module = 'terceros' AND p.sub_module = 'transportadoras' AND p.action IN('view', 'manage')) OR
                                                                                                            (p.main_module = 'inventario' AND p.sub_module = 'productos' AND p.action = 'view') OR
                                                                                                                (p.main_module = 'inventario' AND p.sub_module = 'existencias' AND p.action = 'view') OR
                                                                                                                    (p.main_module = 'inventario' AND p.sub_module = 'devoluciones' AND p.action IN('view', 'manage')) OR
                                                                                                                        (p.main_module = 'inventario' AND p.sub_module = 'conteos' AND p.action IN('view', 'manage')) OR
                                                                                                                            (p.main_module = 'cartera' AND p.sub_module IN('creditos', 'abonos', 'verificacion_abonos', 'historial_recaudos')) OR
                                                                                                                                (p.main_module = 'reportes' AND p.action = 'view') OR
                                                                                                                                    (p.main_module = 'tienda' AND p.sub_module = 'pedidos' AND p.action IN('view', 'cancel')) OR
                                                                                                                                        (p.main_module = 'tienda' AND p.sub_module = 'historial_pedidos' AND p.action = 'view') OR
                                                                                                                                            (p.main_module = 'auditorias' AND p.sub_module IN('movimientos', 'cambios_modelo') AND p.action = 'view') OR
                                                                                                                                                (p.main_module = 'usuarios' AND p.sub_module = 'clientes' AND p.action IN('view', 'manage'))
) WHERE r.code = 'administrativo' AND r.company_id = 1;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON(
                                                                                                                                                    (p.main_module = 'tienda' AND p.sub_module = 'catalogo' AND p.action = 'view') OR
                                                                                                                                                        (p.main_module = 'tienda' AND p.sub_module = 'pedidos' AND p.action IN('view', 'create')) OR
                                                                                                                                                            (p.main_module = 'tienda' AND p.sub_module = 'historial_pedidos' AND p.action = 'view')
) WHERE r.code = 'cliente' AND r.company_id = 1;

-- ============================================================
    --11.b COMPANY 2(new tenant) — SOLO admin2
--Nota: company_bootstrap todavía no existe(se crea en §12).
--Se ejecuta on - insert pero como el trigger aún no está
--registrado, se siembra manualmente aquí.
-- ============================================================
    INSERT INTO companies(name, nit, is_host) VALUES('Importadora del Norte', '900000002-2', FALSE);

--Roles company 2(copiados de company 1, excepto globales)
INSERT INTO roles(company_id, code, name, description)
SELECT 2, code, name, description FROM roles
WHERE company_id = 1 AND NOT is_global;

--Price levels company 2
INSERT INTO price_levels(company_id, code, name, position, is_default)
SELECT 2, code, name, position, is_default FROM price_levels WHERE company_id = 1;

--Role permissions company 2(excepto 'admin' que recibe TODO menos companias)
INSERT INTO role_permissions(role_id, permission_id)
SELECT nr.id, rp.permission_id
FROM roles hr
JOIN role_permissions rp ON rp.role_id = hr.id
JOIN roles nr ON nr.company_id = 2 AND nr.code = hr.code
WHERE hr.company_id = 1 AND NOT hr.is_global AND hr.code <> 'admin';

--Admin2: recibe TODO excepto companias(mismo criterio que admin1)
INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.code = 'admin' AND r.company_id = 2 AND p.main_module <> 'companias';

-- ============================================================
    --12. FUNCTIONS & TRIGGERS
-- ============================================================
    CREATE OR REPLACE FUNCTION audit_ctx(p_key TEXT) RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('app.' || p_key, true), '')
$$ LANGUAGE sql STABLE;

--Helper: mapea entidad -> module_group
CREATE OR REPLACE FUNCTION audit_module_group(p_entity TEXT) RETURNS TEXT AS $$
  SELECT CASE
    WHEN p_entity IN('sales', 'sale_items', 'sale_stages', 'carts', 'cart_items', 'quotations', 'quotation_items', 'returns', 'return_items') THEN 'tienda'
    WHEN p_entity IN('payments', 'credit_entries', 'cash_registers', 'cash_sessions', 'cash_movements', 'cash_closures') THEN 'cartera'
    WHEN p_entity IN('purchases', 'purchase_items', 'stock', 'stock_movements', 'stock_counts', 'stock_count_items', 'stock_shares', 'stores', 'store_warehouses', 'warehouses') THEN 'inventario'
    WHEN p_entity IN('users', 'roles', 'role_permissions', 'refresh_tokens', 'customers', 'customer_discounts') THEN 'usuarios'
    WHEN p_entity IN('partners', 'product_suppliers') THEN 'terceros'
    WHEN p_entity IN('siigo_credentials', 'siigo_outbox', 'invoices') THEN 'siigo'
    WHEN p_entity IN('companies', 'price_levels') THEN 'companias'
    ELSE 'sistema'
END
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_inline_customer(p_company BIGINT) RETURNS BIGINT AS $$
  SELECT id FROM customers WHERE company_id = p_company AND is_inline = TRUE AND status = 'active' LIMIT 1;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_companies_upd BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_upd     BEFORE UPDATE ON users     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_customers_upd BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_products_upd  BEFORE UPDATE ON products  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sales_upd     BEFORE UPDATE ON sales     FOR EACH ROW EXECUTE FUNCTION set_updated_at();

--company_guard
CREATE OR REPLACE FUNCTION company_guard() RETURNS trigger AS $$
DECLARE v_arg TEXT; v_col TEXT; v_tbl TEXT; v_kind TEXT; v_row JSONB:= to_jsonb(NEW); v_val BIGINT; v_comp BIGINT; v_k TEXT;
        v_own BIGINT:= (to_jsonb(NEW) ->> 'company_id'):: BIGINT;
BEGIN
  FOREACH v_arg IN ARRAY TG_ARGV LOOP
v_col:= split_part(v_arg, ':', 1); v_tbl:= split_part(v_arg, ':', 2); v_kind:= split_part(v_arg, ':', 3);
v_val:= (v_row ->> v_col):: BIGINT;
    CONTINUE WHEN v_val IS NULL;
    IF v_kind = '' THEN
      EXECUTE format('SELECT company_id FROM %I WHERE id = $1', v_tbl) INTO v_comp USING v_val;
ELSE
      EXECUTE format('SELECT company_id, kind FROM %I WHERE id = $1', v_tbl) INTO v_comp, v_k USING v_val;
      IF v_k IS DISTINCT FROM v_kind THEN
        RAISE EXCEPTION '% (%) no es un tercero de tipo %', v_col, v_val, v_kind USING ERRCODE = '23514';
      END IF;
    END IF;
    IF v_own IS NULL THEN v_own:= v_comp;
    ELSIF v_comp IS DISTINCT FROM v_own THEN
      RAISE EXCEPTION '% (%) pertenece a otra compañía', v_col, v_val USING ERRCODE = '23514';
    END IF;
  END LOOP;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_company_users      BEFORE INSERT OR UPDATE ON users      FOR EACH ROW EXECUTE FUNCTION company_guard('role_id:roles', 'warehouse_id:warehouses');
CREATE TRIGGER trg_company_customers  BEFORE INSERT OR UPDATE ON customers  FOR EACH ROW EXECUTE FUNCTION company_guard('user_id:users', 'price_level_id:price_levels');
CREATE TRIGGER trg_company_products   BEFORE INSERT OR UPDATE ON products   FOR EACH ROW EXECUTE FUNCTION company_guard('category_id:categories', 'model_id:models');
CREATE TRIGGER trg_company_prices     BEFORE INSERT OR UPDATE ON product_prices    FOR EACH ROW EXECUTE FUNCTION company_guard('product_id:products', 'price_level_id:price_levels');
CREATE TRIGGER trg_company_prod_sup   BEFORE INSERT OR UPDATE ON product_suppliers FOR EACH ROW EXECUTE FUNCTION company_guard('product_id:products', 'supplier_id:partners:supplier');
CREATE TRIGGER trg_company_stock      BEFORE INSERT OR UPDATE ON stock             FOR EACH ROW EXECUTE FUNCTION company_guard('product_id:products', 'warehouse_id:warehouses');
CREATE TRIGGER trg_company_store_wh   BEFORE INSERT OR UPDATE ON store_warehouses  FOR EACH ROW EXECUTE FUNCTION company_guard('store_id:stores', 'warehouse_id:warehouses');
CREATE TRIGGER trg_company_sales      BEFORE INSERT OR UPDATE ON sales     FOR EACH ROW EXECUTE FUNCTION company_guard('customer_id:customers', 'seller_id:users', 'warehouse_id:warehouses', 'store_id:stores', 'aux_warehouse_id:warehouses', 'price_level_id:price_levels', 'carrier_id:partners:carrier');
CREATE TRIGGER trg_company_sale_items BEFORE INSERT OR UPDATE ON sale_items FOR EACH ROW EXECUTE FUNCTION company_guard('sale_id:sales', 'product_id:products');
CREATE TRIGGER trg_company_carts      BEFORE INSERT OR UPDATE ON carts     FOR EACH ROW EXECUTE FUNCTION company_guard('user_id:users', 'customer_id:customers', 'warehouse_id:warehouses', 'price_level_id:price_levels');
CREATE TRIGGER trg_company_cart_items BEFORE INSERT OR UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION company_guard('cart_id:carts', 'product_id:products');
CREATE TRIGGER trg_company_quotations BEFORE INSERT OR UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION company_guard('customer_id:customers', 'seller_id:users', 'cart_id:carts');
CREATE TRIGGER trg_company_payments   BEFORE INSERT OR UPDATE ON payments  FOR EACH ROW EXECUTE FUNCTION company_guard('sale_id:sales', 'customer_id:customers');
CREATE TRIGGER trg_company_returns    BEFORE INSERT OR UPDATE ON returns   FOR EACH ROW EXECUTE FUNCTION company_guard('sale_id:sales', 'customer_id:customers');
CREATE TRIGGER trg_company_credit     BEFORE INSERT OR UPDATE ON credit_entries FOR EACH ROW EXECUTE FUNCTION company_guard('customer_id:customers', 'sale_id:sales', 'payment_id:payments', 'return_id:returns');
CREATE TRIGGER trg_company_purchases  BEFORE INSERT OR UPDATE ON purchases FOR EACH ROW EXECUTE FUNCTION company_guard('supplier_id:partners:supplier', 'warehouse_id:warehouses');
CREATE TRIGGER trg_company_counts     BEFORE INSERT OR UPDATE ON stock_counts FOR EACH ROW EXECUTE FUNCTION company_guard('warehouse_id:warehouses');
CREATE TRIGGER trg_company_invoices   BEFORE INSERT OR UPDATE ON invoices  FOR EACH ROW EXECUTE FUNCTION company_guard('sale_id:sales');

--Superadmin global consistency
CREATE OR REPLACE FUNCTION user_global_consistency() RETURNS trigger AS $$
DECLARE v_is_global BOOLEAN;
BEGIN
  SELECT is_global INTO v_is_global FROM roles WHERE id = NEW.role_id;
  IF NEW.company_id IS NULL THEN
    IF NOT v_is_global THEN
      RAISE EXCEPTION 'Un usuario sin compañía debe tener un rol global (is_global=true)' USING ERRCODE = '23514';
    END IF;
    IF NEW.warehouse_id IS NOT NULL THEN
      RAISE EXCEPTION 'Un usuario global (sin compañía) no puede tener bodega asignada' USING ERRCODE = '23514';
    END IF;
ELSE
    IF v_is_global THEN
      RAISE EXCEPTION 'Un rol global solo puede asignarse a un usuario sin compañía' USING ERRCODE = '23514';
    END IF;
    IF NOT EXISTS(SELECT 1 FROM roles r WHERE r.id = NEW.role_id AND r.company_id = NEW.company_id) THEN
      RAISE EXCEPTION 'El rol no pertenece a la compañía del usuario' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_user_global_consistency BEFORE INSERT OR UPDATE ON users FOR EACH ROW EXECUTE FUNCTION user_global_consistency();

--Role guard
CREATE OR REPLACE FUNCTION role_guard() RETURNS trigger AS $$
BEGIN
  IF NEW.is_global AND NOT EXISTS(SELECT 1 FROM companies WHERE id = NEW.company_id AND is_host) THEN
    RAISE EXCEPTION 'Un rol global solo puede pertenecer a la compañía anfitriona';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_role_guard BEFORE INSERT OR UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION role_guard();

--company_bootstrap(para tenants nuevos, no para host)
CREATE OR REPLACE FUNCTION company_bootstrap() RETURNS trigger AS $$
DECLARE v_host BIGINT;
BEGIN
  SELECT id INTO v_host FROM companies WHERE is_host;
  IF v_host IS NULL OR v_host = NEW.id THEN RETURN NEW; END IF;
  INSERT INTO roles(company_id, code, name, description)
    SELECT NEW.id, code, name, description FROM roles WHERE company_id = v_host AND NOT is_global;
  INSERT INTO role_permissions(role_id, permission_id)
    SELECT nr.id, rp.permission_id FROM roles hr JOIN role_permissions rp ON rp.role_id = hr.id
      JOIN roles nr ON nr.company_id = NEW.id AND nr.code = hr.code WHERE hr.company_id = v_host AND NOT hr.is_global;
  INSERT INTO price_levels(company_id, code, name, position, is_default)
    SELECT NEW.id, code, name, position, is_default FROM price_levels WHERE company_id = v_host;
  INSERT INTO customers(company_id, is_inline, customer_type, document_type, document_number, check_digit,
    business_name, tax_regime, price_level_id, credit_enabled, credit_limit, status)
    SELECT NEW.id, TRUE, 'final_consumer', 'NIT', '222222222222', 0,
    'Cliente de Línea', 'non_responsible',
    (SELECT id FROM price_levels WHERE company_id = NEW.id AND is_default LIMIT 1),
FALSE, 0, 'active';
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_company_bootstrap AFTER INSERT ON companies FOR EACH ROW EXECUTE FUNCTION company_bootstrap();

--user_can
CREATE OR REPLACE FUNCTION user_can(p_user BIGINT, p_main TEXT, p_sub TEXT, p_action TEXT) RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM users u
      JOIN roles r ON r.id = u.role_id AND r.is_active
      JOIN role_permissions rp ON rp.role_id = r.id
      JOIN permissions p ON p.id = rp.permission_id
        AND p.main_module = p_main AND p.sub_module = p_sub AND p.action = p_action
     WHERE u.id = p_user AND u.status = 'active' AND u.deleted_at IS NULL)
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION user_can_access_company(p_user BIGINT, p_company BIGINT) RETURNS BOOLEAN AS $$
  SELECT EXISTS(
        SELECT 1 FROM users u
     WHERE u.id = p_user AND u.status = 'active' AND u.deleted_at IS NULL
       AND(u.company_id = p_company OR u.company_id IS NULL))
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth_login_allowed(p_user_id BIGINT) RETURNS BOOLEAN AS $$
  SELECT EXISTS(
            SELECT 1 FROM users u
    LEFT JOIN companies c ON c.id = u.company_id
    WHERE u.id = p_user_id AND u.status = 'active' AND u.deleted_at IS NULL
      AND u.user_type = 'employee'
      AND(u.company_id IS NULL OR c.is_active)
        )
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION refresh_token_guard() RETURNS trigger AS $$
BEGIN
  IF NOT auth_login_allowed(NEW.user_id) THEN
    RAISE EXCEPTION 'Este usuario no puede iniciar sesión' USING ERRCODE = '28000';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_refresh_token_guard BEFORE INSERT ON refresh_tokens FOR EACH ROW EXECUTE FUNCTION refresh_token_guard();

CREATE OR REPLACE FUNCTION user_status_cascade() RETURNS trigger AS $$
BEGIN
  IF NEW.status <> 'active' OR NEW.deleted_at IS NOT NULL THEN
    UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = NEW.id AND revoked_at IS NULL;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_user_status_cascade AFTER UPDATE OF status, deleted_at ON users FOR EACH ROW EXECUTE FUNCTION user_status_cascade();

--product_guard
CREATE OR REPLACE FUNCTION product_guard() RETURNS trigger AS $$
BEGIN
  IF NEW.brand_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM company_brands WHERE company_id = NEW.company_id AND brand_id = NEW.brand_id AND is_active) THEN
    RAISE EXCEPTION 'La compañía no está conectada con la marca %', NEW.brand_id USING ERRCODE = '23514';
  END IF;
NEW.search_text := lower(concat_ws(' ', NEW.code, NEW.name, NEW.description,
    (SELECT name FROM brands WHERE id = NEW.brand_id), (SELECT name FROM categories WHERE id = NEW.category_id), (SELECT name FROM models WHERE id = NEW.model_id)));
NEW.qr_payload := 'IMP:' || NEW.uuid;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_product_guard BEFORE INSERT OR UPDATE OF brand_id, category_id, model_id, code, name, description ON products FOR EACH ROW EXECUTE FUNCTION product_guard();

CREATE OR REPLACE FUNCTION ensure_product_active(p_product BIGINT) RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM products WHERE id = p_product AND status = 'active' AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'El producto % no está activo', p_product USING ERRCODE = '23514';
  END IF;
END; $$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION ensure_customer_active(p_customer BIGINT) RETURNS VOID AS $$
BEGIN
  IF p_customer IS NOT NULL AND NOT EXISTS(SELECT 1 FROM customers WHERE id = p_customer AND status = 'active' AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'El cliente % no está activo', p_customer USING ERRCODE = '23514';
  END IF;
END; $$ LANGUAGE plpgsql STABLE;

--customer_ref_guard: INSERT + UPDATE OF customer_id(V10 fix)
CREATE OR REPLACE FUNCTION customer_ref_guard() RETURNS trigger AS $$
BEGIN PERFORM ensure_customer_active(NEW.customer_id); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_carts_customer_insert      BEFORE INSERT ON carts      FOR EACH ROW EXECUTE FUNCTION customer_ref_guard();
CREATE TRIGGER trg_carts_customer_update      BEFORE UPDATE OF customer_id ON carts      FOR EACH ROW EXECUTE FUNCTION customer_ref_guard();
CREATE TRIGGER trg_quotations_customer_insert BEFORE INSERT ON quotations FOR EACH ROW EXECUTE FUNCTION customer_ref_guard();
CREATE TRIGGER trg_quotations_customer_update BEFORE UPDATE OF customer_id ON quotations FOR EACH ROW EXECUTE FUNCTION customer_ref_guard();
CREATE TRIGGER trg_sales_customer_insert      BEFORE INSERT ON sales      FOR EACH ROW EXECUTE FUNCTION customer_ref_guard();
CREATE TRIGGER trg_sales_customer_update      BEFORE UPDATE OF customer_id ON sales      FOR EACH ROW EXECUTE FUNCTION customer_ref_guard();

CREATE OR REPLACE FUNCTION line_product_guard() RETURNS trigger AS $$
BEGIN PERFORM ensure_product_active(NEW.product_id); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_quotation_items_active BEFORE INSERT ON quotation_items FOR EACH ROW EXECUTE FUNCTION line_product_guard();

CREATE OR REPLACE FUNCTION get_product_price(p_product BIGINT, p_price_level BIGINT) RETURNS NUMERIC AS $$
  SELECT amount FROM product_prices WHERE product_id = p_product AND price_level_id = p_price_level;
$$ LANGUAGE sql STABLE;

--Virtual stock sync
CREATE OR REPLACE FUNCTION refresh_product_virtual_stock(p_product_id BIGINT) RETURNS VOID AS $$
DECLARE v_company BIGINT; v_stock INTEGER; v_borrowed INTEGER;
BEGIN
  SELECT company_id INTO v_company FROM products WHERE id = p_product_id;
  SELECT COALESCE(SUM(available - in_cart - reserved), 0) INTO v_stock
    FROM stock s JOIN warehouses w ON w.id = s.warehouse_id
   WHERE s.product_id = p_product_id AND w.company_id = v_company;
  SELECT COALESCE(SUM(LEAST(ss.qty_authorized - ss.qty_used, s.available - s.in_cart - s.reserved)), 0) INTO v_borrowed
    FROM stock_shares ss JOIN stock s ON s.id = ss.stock_id
   WHERE ss.borrower_company_id = v_company AND ss.borrower_product_id = p_product_id AND ss.status = 'active';
  UPDATE products SET virtual_stock = GREATEST(v_stock + v_borrowed, 0) WHERE id = p_product_id;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_all_virtual_stocks() RETURNS INTEGER AS $$
DECLARE r RECORD; v_n INTEGER:= 0;
BEGIN
  FOR r IN SELECT id FROM products LOOP
    PERFORM refresh_product_virtual_stock(r.id);
v_n:= v_n + 1;
  END LOOP;
  RETURN v_n;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION stock_virtual_trigger() RETURNS trigger AS $$
DECLARE r RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM refresh_product_virtual_stock(OLD.product_id);
    FOR r IN SELECT borrower_product_id FROM stock_shares WHERE stock_id = OLD.id LOOP
      PERFORM refresh_product_virtual_stock(r.borrower_product_id);
    END LOOP;
    RETURN OLD;
ELSE
    PERFORM refresh_product_virtual_stock(NEW.product_id);
    IF TG_OP = 'UPDATE' AND OLD.product_id IS DISTINCT FROM NEW.product_id THEN
      PERFORM refresh_product_virtual_stock(OLD.product_id);
    END IF;
    FOR r IN SELECT borrower_product_id FROM stock_shares WHERE stock_id = NEW.id LOOP
      PERFORM refresh_product_virtual_stock(r.borrower_product_id);
    END LOOP;
    RETURN NEW;
  END IF;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_stock_virtual AFTER INSERT OR UPDATE OF available, in_cart, reserved OR DELETE ON stock FOR EACH ROW EXECUTE FUNCTION stock_virtual_trigger();

CREATE OR REPLACE FUNCTION stock_share_virtual_trigger() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN PERFORM refresh_product_virtual_stock(OLD.borrower_product_id); RETURN OLD;
ELSE
    PERFORM refresh_product_virtual_stock(NEW.borrower_product_id);
    IF TG_OP = 'UPDATE' AND OLD.borrower_product_id IS DISTINCT FROM NEW.borrower_product_id THEN
      PERFORM refresh_product_virtual_stock(OLD.borrower_product_id);
    END IF;
    RETURN NEW;
  END IF;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_stock_share_virtual AFTER INSERT OR UPDATE OF qty_authorized, qty_used, status OR DELETE ON stock_shares FOR EACH ROW EXECUTE FUNCTION stock_share_virtual_trigger();

CREATE OR REPLACE FUNCTION stock_share_guard() RETURNS trigger AS $$
DECLARE v_owner BIGINT; v_free INTEGER;
BEGIN
  SELECT p.company_id, s.available - s.in_cart - s.reserved INTO v_owner, v_free
    FROM stock s JOIN products p ON p.id = s.product_id WHERE s.id = NEW.stock_id;
  IF v_owner IS DISTINCT FROM NEW.owner_company_id THEN RAISE EXCEPTION 'La existencia no pertenece a la compañía dueña del stock'; END IF;
  IF NOT EXISTS(SELECT 1 FROM products WHERE id = NEW.borrower_product_id AND company_id = NEW.borrower_company_id) THEN
    RAISE EXCEPTION 'El producto no pertenece a la compañía que recibe el stock';
  END IF;
  IF TG_OP = 'INSERT' AND NEW.qty_authorized > v_free THEN
    RAISE EXCEPTION 'No hay stock libre suficiente para prestar (libre %)', v_free USING ERRCODE = '23514';
  END IF;
  IF NEW.status = 'closed' AND NEW.closed_at IS NULL THEN NEW.closed_at := now(); END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_stock_share_guard BEFORE INSERT OR UPDATE ON stock_shares FOR EACH ROW EXECUTE FUNCTION stock_share_guard();

CREATE OR REPLACE FUNCTION stock_hold(p_company BIGINT, p_product BIGINT, p_stock BIGINT, p_bucket TEXT, p_delta INTEGER) RETURNS BIGINT AS $$
DECLARE v_owner BIGINT; v_stock_product BIGINT; v_virtual INTEGER;
BEGIN
  SELECT virtual_stock INTO v_virtual FROM products WHERE id = p_product FOR UPDATE;
  IF p_delta > 0 AND v_virtual < p_delta THEN
    RAISE EXCEPTION 'Stock virtual insuficiente para el producto % (disponible %, solicitado %)', p_product, v_virtual, p_delta USING ERRCODE = '23514';
  END IF;
  SELECT p.company_id, p.id INTO v_owner, v_stock_product FROM stock s JOIN products p ON p.id = s.product_id WHERE s.id = p_stock;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'La existencia % no existe', p_stock; END IF;
  IF v_owner = p_company THEN
    IF v_stock_product <> p_product THEN RAISE EXCEPTION 'La existencia % no es del producto %', p_stock, p_product; END IF;
ELSE
    UPDATE stock_shares SET qty_used = qty_used + p_delta
     WHERE owner_company_id = v_owner AND borrower_company_id = p_company AND stock_id = p_stock
       AND borrower_product_id = p_product AND(status = 'active' OR p_delta < 0)
       AND qty_used + p_delta BETWEEN 0 AND qty_authorized;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'La compañía % no tiene stock prestado suficiente en la existencia %', p_company, p_stock USING ERRCODE = '23514';
    END IF;
  END IF;
  IF p_bucket = 'in_cart' THEN
    UPDATE stock SET in_cart = in_cart + p_delta, updated_at = now()
     WHERE id = p_stock AND(p_delta < 0 OR available - reserved - in_cart >= p_delta);
ELSE
    UPDATE stock SET reserved = reserved + p_delta, updated_at = now()
     WHERE id = p_stock AND(p_delta < 0 OR available - reserved - in_cart >= p_delta);
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Stock insuficiente en la existencia %', p_stock USING ERRCODE = '23514'; END IF;
  RETURN v_owner;
END; $$ LANGUAGE plpgsql;

--Cart items guard
CREATE OR REPLACE FUNCTION cart_items_guard() RETURNS trigger AS $$
DECLARE v_cart carts%ROWTYPE; v_cart_id BIGINT; v_delta INTEGER; v_prod BIGINT; v_loc BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN v_cart_id:= OLD.cart_id; v_delta:= -OLD.quantity; v_prod:= OLD.product_id; v_loc:= OLD.stock_id;
  ELSIF TG_OP = 'INSERT' THEN v_cart_id:= NEW.cart_id; v_delta:= NEW.quantity; v_prod:= NEW.product_id; v_loc:= NEW.stock_id; PERFORM ensure_product_active(NEW.product_id);
  ELSE v_cart_id:= NEW.cart_id; v_delta:= NEW.quantity - OLD.quantity; v_prod:= NEW.product_id; v_loc:= NEW.stock_id; END IF;
SELECT * INTO v_cart FROM carts WHERE id = v_cart_id;
  IF v_cart.status = 'open' THEN
    IF v_cart.expires_at < now() AND v_delta > 0 THEN RAISE EXCEPTION 'El carrito venció: ábrelo de nuevo'; END IF;
    IF v_delta <> 0 THEN PERFORM stock_hold(v_cart.company_id, v_prod, v_loc, 'in_cart', v_delta); END IF;
  ELSIF v_delta > 0 THEN RAISE EXCEPTION 'El carrito ya no está abierto'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_cart_items_guard BEFORE INSERT OR DELETE OR UPDATE OF quantity ON cart_items FOR EACH ROW EXECUTE FUNCTION cart_items_guard();

CREATE OR REPLACE FUNCTION cart_release() RETURNS trigger AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT product_id, stock_id, quantity FROM cart_items WHERE cart_id = NEW.id LOOP
    PERFORM stock_hold(NEW.company_id, r.product_id, r.stock_id, 'in_cart', -r.quantity);
  END LOOP;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_cart_release AFTER UPDATE OF status ON carts FOR EACH ROW
WHEN(OLD.status = 'open' AND NEW.status <> 'open') EXECUTE FUNCTION cart_release();

CREATE OR REPLACE FUNCTION release_expired_carts() RETURNS INTEGER AS $$
DECLARE v_n INTEGER;
BEGIN
  UPDATE carts SET status = 'abandoned' WHERE status = 'open' AND expires_at < now();
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END; $$ LANGUAGE plpgsql;

--Quotations
CREATE OR REPLACE FUNCTION quotation_flow_guard() RETURNS trigger AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NOT((OLD.status = 'draft' AND NEW.status IN('sent', 'expired'))
OR(OLD.status = 'sent' AND NEW.status IN('accepted', 'expired'))
OR(OLD.status = 'accepted' AND NEW.status IN('converted', 'expired'))) THEN
    RAISE EXCEPTION 'La cotización no puede pasar de % a %', OLD.status, NEW.status;
  END IF;
  IF NEW.status = 'converted' AND NEW.sale_id IS NULL THEN
    RAISE EXCEPTION 'Para convertir la cotización se necesita el pedido creado';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_quotation_flow BEFORE UPDATE OF status ON quotations FOR EACH ROW EXECUTE FUNCTION quotation_flow_guard();

--Sale header
CREATE OR REPLACE FUNCTION sale_header_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM ensure_customer_active(NEW.customer_id);
    IF NOT EXISTS(SELECT 1 FROM warehouses WHERE id = NEW.warehouse_id AND is_active) THEN RAISE EXCEPTION 'La bodega está inactiva'; END IF;
    IF NEW.seller_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM users WHERE id = NEW.seller_id AND status = 'active' AND deleted_at IS NULL) THEN RAISE EXCEPTION 'El vendedor está inactivo'; END IF;
    IF NEW.immediate_picking AND NEW.sale_type <> 'sale' THEN RAISE EXCEPTION 'El picking inmediato es solo para ventas'; END IF;
NEW.current_stage := CASE NEW.sale_type WHEN 'sale' THEN 'verification' ELSE 'picking' END;
NEW.stage_state := 'available';
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND OLD.status <> 'open' THEN
    RAISE EXCEPTION 'El pedido % ya está %: no se puede reabrir', OLD.serial_code, OLD.status;
  END IF;
  IF NEW.status = 'cancelled' AND OLD.status = 'open' THEN
    IF EXISTS(SELECT 1 FROM sale_stages WHERE sale_id = OLD.id AND stage = 'shipping' AND status <> 'available') THEN
      RAISE EXCEPTION 'El pedido % ya está en envío: no se puede cancelar', OLD.serial_code;
    END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_sale_header_guard BEFORE INSERT OR UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION sale_header_guard();

CREATE OR REPLACE FUNCTION sale_create_stages() RETURNS trigger AS $$
BEGIN
  INSERT INTO sale_stages(sale_id, stage, position)
  SELECT NEW.id, s.stage, s.pos
FROM(VALUES('verification', 1), ('invoicing', 2), ('picking', 3), ('packing', 4), ('shipping', 5), ('delivery', 6)) AS s(stage, pos)
  WHERE NEW.sale_type = 'sale' OR s.stage IN('picking', 'packing', 'shipping', 'delivery');
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_sale_create_stages AFTER INSERT ON sales FOR EACH ROW EXECUTE FUNCTION sale_create_stages();

CREATE OR REPLACE FUNCTION sale_items_guard() RETURNS trigger AS $$
DECLARE v_sale sales%ROWTYPE; v_sale_id BIGINT; v_delta INTEGER; v_prod BIGINT; v_loc BIGINT; v_edit BOOLEAN; v_owner BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN
v_sale_id:= OLD.sale_id; v_delta:= -OLD.quantity; v_prod:= OLD.product_id; v_loc:= OLD.stock_id; v_edit:= TRUE;
  ELSIF TG_OP = 'INSERT' THEN
v_sale_id:= NEW.sale_id; v_delta:= NEW.quantity; v_prod:= NEW.product_id; v_loc:= NEW.stock_id; v_edit:= TRUE;
    PERFORM ensure_product_active(NEW.product_id);
ELSE
v_sale_id:= NEW.sale_id; v_delta:= NEW.quantity - OLD.quantity; v_prod:= NEW.product_id; v_loc:= NEW.stock_id; v_edit:= v_delta <> 0;
  END IF;
SELECT * INTO v_sale FROM sales WHERE id = v_sale_id;
  IF v_edit THEN
    IF v_sale.status <> 'open' THEN RAISE EXCEPTION 'El pedido no está abierto: no se pueden cambiar sus productos'; END IF;
    IF v_sale.sale_at IS NOT NULL OR EXISTS(SELECT 1 FROM sale_stages WHERE sale_id = v_sale_id AND stage = 'picking' AND status <> 'available') THEN
      RAISE EXCEPTION 'El pedido ya es venta o el picking empezó: no se pueden cambiar sus productos';
    END IF;
  END IF;
  IF v_delta <> 0 THEN v_owner:= stock_hold(v_sale.company_id, v_prod, v_loc, 'reserved', v_delta); END IF;
  IF TG_OP = 'INSERT' THEN NEW.stock_company_id := v_owner; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_sale_items_guard BEFORE INSERT OR DELETE OR UPDATE OF quantity ON sale_items FOR EACH ROW EXECUTE FUNCTION sale_items_guard();

CREATE OR REPLACE FUNCTION sale_item_total() RETURNS trigger AS $$
BEGIN
NEW.line_total := ROUND(NEW.quantity * NEW.unit_price - NEW.discount, 2)
    + ROUND((NEW.quantity * NEW.unit_price - NEW.discount) * NEW.tax_percent / 100, 2);
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_sale_item_total BEFORE INSERT OR UPDATE OF quantity, unit_price, discount, tax_percent ON sale_items FOR EACH ROW EXECUTE FUNCTION sale_item_total();

CREATE OR REPLACE FUNCTION sale_recalc_totals() RETURNS trigger AS $$
DECLARE v_sale BIGINT:= CASE WHEN TG_OP = 'DELETE' THEN OLD.sale_id ELSE NEW.sale_id END;
BEGIN
  UPDATE sales s SET
subtotal = COALESCE(x.sub, 0), discount_total = COALESCE(x.disc, 0),
    tax_total = COALESCE(x.tax, 0), total = COALESCE(x.sub, 0) - COALESCE(x.disc, 0) + COALESCE(x.tax, 0)
FROM(SELECT SUM(quantity * unit_price) AS sub, SUM(discount) AS disc,
    SUM(ROUND((quantity * unit_price - discount) * tax_percent / 100, 2)) AS tax
          FROM sale_items WHERE sale_id = v_sale) x
  WHERE s.id = v_sale;
  RETURN NULL;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_sale_recalc AFTER INSERT OR DELETE OR UPDATE OF quantity, unit_price, discount, tax_percent ON sale_items FOR EACH ROW EXECUTE FUNCTION sale_recalc_totals();

CREATE OR REPLACE FUNCTION sale_confirm_payment(p_sale BIGINT) RETURNS VOID AS $$
DECLARE s sales%ROWTYPE; c customers%ROWTYPE; v_code TEXT; v_paid NUMERIC; v_debt NUMERIC;
BEGIN
SELECT * INTO s FROM sales WHERE id = p_sale;
v_code:= s.payment_method;
  SELECT COALESCE(SUM(amount), 0) INTO v_paid FROM payments WHERE sale_id = p_sale AND status = 'verified';

  IF v_paid >= s.total THEN
    UPDATE sales SET payment_condition = 'cash', sale_at = now(), paid_total = v_paid WHERE id = p_sale;
  ELSIF v_code = 'credit' THEN
    IF s.customer_id IS NULL THEN RAISE EXCEPTION 'La venta a crédito necesita un cliente'; END IF;
SELECT * INTO c FROM customers WHERE id = s.customer_id;
    IF c.customer_type = 'final_consumer' THEN RAISE EXCEPTION 'El consumidor final no puede tener crédito'; END IF;
    IF NOT c.credit_enabled OR c.status <> 'active' THEN
      RAISE EXCEPTION 'El cliente % no tiene crédito habilitado o está en mora', c.display_name USING ERRCODE = '23514';
    END IF;
    SELECT COALESCE(SUM(amount), 0) INTO v_debt FROM credit_entries WHERE customer_id = c.id AND bucket = 'pending';
    IF v_debt + (s.total - v_paid) > c.credit_limit THEN
      RAISE EXCEPTION 'Supera el cupo de crédito (cupo %, deuda %)', c.credit_limit, v_debt USING ERRCODE = '23514';
    END IF;
    INSERT INTO credit_entries(company_id, customer_id, bucket, entry_type, amount, sale_id, created_by)
VALUES(s.company_id, c.id, 'pending', 'charge', s.total - v_paid, s.id, audit_ctx('user_id'):: BIGINT);
    UPDATE sales SET payment_condition = 'credit', sale_at = now(), paid_total = v_paid WHERE id = p_sale;
ELSE
    RAISE EXCEPTION 'El pago verificado (%) no cubre el total (%)', v_paid, s.total USING ERRCODE = '23514';
  END IF;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sale_stage_guard() RETURNS trigger AS $$
DECLARE v_sale sales%ROWTYPE;
BEGIN
  IF NEW.status = OLD.status AND NEW.assigned_to IS NOT DISTINCT FROM OLD.assigned_to THEN RETURN NEW; END IF;
SELECT * INTO v_sale FROM sales WHERE id = NEW.sale_id FOR UPDATE;
  IF v_sale.status <> 'open' THEN RAISE EXCEPTION 'El pedido % está %', v_sale.serial_code, v_sale.status; END IF;
  IF OLD.status IN('occupied', 'paused') AND NEW.assigned_to IS NOT NULL AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    RAISE EXCEPTION 'La etapa % del pedido % ya la tiene otro empleado', NEW.stage, v_sale.serial_code USING ERRCODE = '55P03';
  END IF;
  IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    IF NOT user_can(NEW.assigned_to, 'tienda', 'pedidos', 'take_' || NEW.stage) THEN
      RAISE EXCEPTION 'El empleado no tiene permiso para la etapa %', NEW.stage USING ERRCODE = '42501';
    END IF;
  END IF;
  IF NOT((OLD.status = 'available' AND NEW.status = 'occupied')
OR(OLD.status = 'occupied'  AND NEW.status IN('paused', 'completed', 'available'))
OR(OLD.status = 'paused'    AND NEW.status IN('occupied', 'available'))
OR(OLD.status = 'completed' AND NEW.status IN('verified', 'occupied'))
OR(OLD.status = 'available' AND NEW.status = 'verified' AND NEW.stage = 'picking' AND v_sale.immediate_picking) ) THEN
    RAISE EXCEPTION 'La etapa % no puede pasar de % a %', NEW.stage, OLD.status, NEW.status;
  END IF;
  IF OLD.status = 'available' AND NEW.status IN('occupied', 'verified')
     AND EXISTS(SELECT 1 FROM sale_stages WHERE sale_id = NEW.sale_id AND position < NEW.position AND status <> 'verified') THEN
    RAISE EXCEPTION 'No se puede iniciar %: la etapa anterior no está verificada', NEW.stage;
  END IF;
  IF OLD.status = 'completed' AND NEW.status = 'occupied' AND audit_ctx('reason') IS NULL THEN
    RAISE EXCEPTION 'Devolver una etapa exige un motivo';
  END IF;
  IF NEW.status = 'available' THEN NEW.assigned_to := NULL; END IF;
  IF NEW.status = 'occupied' AND OLD.status = 'available' THEN NEW.started_at := now(); END IF;
  IF NEW.status = 'completed' THEN
NEW.completed_at := now();
    IF NEW.stage = 'picking' AND EXISTS(SELECT 1 FROM sale_items WHERE sale_id = NEW.sale_id AND picked_qty < quantity) THEN RAISE EXCEPTION 'Faltan ítems por sacar'; END IF;
    IF NEW.stage = 'packing' AND EXISTS(SELECT 1 FROM sale_items WHERE sale_id = NEW.sale_id AND packed_qty < quantity) THEN RAISE EXCEPTION 'Faltan ítems por empacar'; END IF;
  END IF;
  IF NEW.status = 'verified' THEN
    IF NOT user_can(NEW.verified_by, 'tienda', 'pedidos', 'take_' || NEW.stage) THEN
      RAISE EXCEPTION 'El empleado no tiene permiso para verificar la etapa %', NEW.stage USING ERRCODE = '42501';
    END IF;
NEW.verified_at := now();
    IF OLD.status = 'available' THEN
NEW.completed_at := now(); NEW.started_at := now(); NEW.assigned_to := COALESCE(NEW.assigned_to, NEW.verified_by);
      UPDATE sale_items SET picked_qty = quantity WHERE sale_id = NEW.sale_id;
    END IF;
    IF NEW.stage = 'invoicing' THEN PERFORM sale_confirm_payment(NEW.sale_id); END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_sale_stage_guard BEFORE UPDATE ON sale_stages FOR EACH ROW EXECUTE FUNCTION sale_stage_guard();

CREATE OR REPLACE FUNCTION sale_stage_after() RETURNS trigger AS $$
DECLARE v_stage TEXT; v_state TEXT; v_sale sales%ROWTYPE;
BEGIN
SELECT * INTO v_sale FROM sales WHERE id = NEW.sale_id;
  SELECT stage, status INTO v_stage, v_state FROM sale_stages WHERE sale_id = NEW.sale_id AND status <> 'verified' ORDER BY position LIMIT 1;
  IF v_stage IS NULL THEN UPDATE sales SET status = 'completed', current_stage = 'delivery', stage_state = 'verified' WHERE id = NEW.sale_id;
  ELSE UPDATE sales SET current_stage = v_stage, stage_state = v_state WHERE id = NEW.sale_id; END IF;
  IF NEW.stage = 'picking' AND NEW.status = 'verified' AND OLD.status <> 'verified' AND v_sale.immediate_picking AND v_sale.sale_type = 'sale' THEN
    UPDATE stock sl SET reserved = sl.reserved - x.q, available = sl.available - x.q, updated_at = now()
FROM(SELECT stock_id, SUM(quantity) AS q FROM sale_items WHERE sale_id = NEW.sale_id GROUP BY stock_id) x WHERE sl.id = x.stock_id;
    INSERT INTO stock_movements(stock_id, movement_type, quantity, document_type, document_id, created_by)
    SELECT i.stock_id, 'sale_out', -SUM(i.quantity), 'sale', NEW.sale_id, audit_ctx('user_id'):: BIGINT
    FROM sale_items i WHERE i.sale_id = NEW.sale_id GROUP BY i.stock_id;
  END IF;
  IF NEW.stage = 'shipping' AND NEW.status = 'verified' AND OLD.status <> 'verified' THEN
    IF v_sale.sale_type = 'sale' AND NOT v_sale.immediate_picking THEN
      UPDATE stock sl SET reserved = sl.reserved - x.q, available = sl.available - x.q, updated_at = now()
FROM(SELECT stock_id, SUM(quantity) AS q FROM sale_items WHERE sale_id = NEW.sale_id GROUP BY stock_id) x WHERE sl.id = x.stock_id;
      INSERT INTO stock_movements(stock_id, movement_type, quantity, document_type, document_id, created_by)
      SELECT i.stock_id, 'sale_out', -SUM(i.quantity), 'sale', NEW.sale_id, audit_ctx('user_id'):: BIGINT
      FROM sale_items i WHERE i.sale_id = NEW.sale_id GROUP BY i.stock_id;
    ELSIF v_sale.sale_type = 'transfer' THEN
      UPDATE stock sl SET reserved = sl.reserved - x.q, available = sl.available - x.q, updated_at = now()
FROM(SELECT stock_id, SUM(quantity) AS q FROM sale_items WHERE sale_id = NEW.sale_id GROUP BY stock_id) x WHERE sl.id = x.stock_id;
      INSERT INTO stock_movements(stock_id, movement_type, quantity, document_type, document_id, created_by)
      SELECT i.stock_id, 'transfer_out', -SUM(i.quantity), 'sale', NEW.sale_id, audit_ctx('user_id'):: BIGINT
      FROM sale_items i WHERE i.sale_id = NEW.sale_id GROUP BY i.stock_id;
      INSERT INTO stock(product_id, warehouse_id, location, available)
      SELECT i.product_id, v_sale.aux_warehouse_id, '', SUM(i.quantity)
      FROM sale_items i WHERE i.sale_id = NEW.sale_id GROUP BY i.product_id
      ON CONFLICT(product_id, warehouse_id, location) DO UPDATE SET available = stock.available + EXCLUDED.available, updated_at = now();
      INSERT INTO stock_movements(stock_id, movement_type, quantity, document_type, document_id, created_by)
      SELECT s.id, 'transfer_in', i.q, 'sale', NEW.sale_id, audit_ctx('user_id'):: BIGINT
FROM(SELECT i.product_id, SUM(i.quantity) AS q FROM sale_items i WHERE i.sale_id = NEW.sale_id GROUP BY i.product_id) i
      JOIN stock s ON s.product_id = i.product_id AND s.warehouse_id = v_sale.aux_warehouse_id AND s.location = '';
    END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_sale_stage_after AFTER UPDATE ON sale_stages FOR EACH ROW EXECUTE FUNCTION sale_stage_after();

CREATE OR REPLACE FUNCTION sale_cancel_effects() RETURNS trigger AS $$
DECLARE r RECORD; v_charged NUMERIC;
BEGIN
  FOR r IN SELECT product_id, stock_id, SUM(quantity) AS q FROM sale_items WHERE sale_id = NEW.id GROUP BY product_id, stock_id LOOP
    PERFORM stock_hold(NEW.company_id, r.product_id, r.stock_id, 'reserved', -r.q:: INTEGER);
  END LOOP;
  IF NEW.customer_id IS NOT NULL THEN
    IF NEW.paid_total > 0 THEN
      INSERT INTO credit_entries(company_id, customer_id, bucket, entry_type, amount, sale_id, reason, created_by)
VALUES(NEW.company_id, NEW.customer_id, 'in_favor', 'issue', NEW.paid_total, NEW.id, 'Pedido cancelado: ' || NEW.cancel_reason, NEW.cancelled_by);
    END IF;
    SELECT COALESCE(SUM(amount), 0) INTO v_charged FROM credit_entries WHERE sale_id = NEW.id AND bucket = 'pending';
    IF v_charged > 0 THEN
      INSERT INTO credit_entries(company_id, customer_id, bucket, entry_type, amount, sale_id, reason, created_by)
VALUES(NEW.company_id, NEW.customer_id, 'pending', 'adjust', -v_charged, NEW.id, 'Pedido cancelado: ' || NEW.cancel_reason, NEW.cancelled_by);
    END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_sale_cancel_effects AFTER UPDATE OF status ON sales FOR EACH ROW
WHEN(NEW.status = 'cancelled' AND OLD.status = 'open') EXECUTE FUNCTION sale_cancel_effects();

CREATE OR REPLACE FUNCTION payment_guard() RETURNS trigger AS $$
DECLARE s sales%ROWTYPE; v_code TEXT; v_committed NUMERIC;
BEGIN
SELECT * INTO s FROM sales WHERE id = NEW.sale_id;
  IF TG_OP = 'INSERT' THEN
    IF s.status = 'cancelled' THEN RAISE EXCEPTION 'El pedido % está cancelado', s.serial_code; END IF;
NEW.customer_id := COALESCE(NEW.customer_id, s.customer_id);
    SELECT COALESCE(SUM(amount), 0) INTO v_committed FROM payments WHERE sale_id = NEW.sale_id AND status IN('review', 'verified');
    IF v_committed + NEW.amount > s.total THEN
      RAISE EXCEPTION 'El pago supera lo pendiente (pendiente %)', s.total - v_committed USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT((OLD.status = 'review' AND NEW.status IN('verified', 'issue', 'voided'))
OR(OLD.status = 'issue'  AND NEW.status IN('review', 'voided'))
OR(OLD.status = 'verified' AND NEW.status = 'voided')) THEN
      RAISE EXCEPTION 'El pago no puede pasar de % a %', OLD.status, NEW.status;
    END IF;
    IF NEW.status = 'verified' THEN
v_code:= NEW.method;
      IF v_code = 'transfer' AND NEW.proof_url IS NULL THEN RAISE EXCEPTION 'La transferencia necesita comprobante'; END IF;
      IF NEW.verified_by IS NOT NULL AND NOT(user_can(NEW.verified_by, 'cartera', 'verificacion_abonos', 'verify') OR user_can(NEW.verified_by, 'tienda', 'pedidos', 'take_invoicing')) THEN
        RAISE EXCEPTION 'El empleado no tiene permiso para verificar pagos' USING ERRCODE = '42501';
      END IF;
NEW.verified_at := now();
    END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_payment_guard BEFORE INSERT OR UPDATE OF status ON payments FOR EACH ROW EXECUTE FUNCTION payment_guard();

CREATE OR REPLACE FUNCTION payment_effects() RETURNS trigger AS $$
DECLARE s sales%ROWTYPE; v_code TEXT; v_sign INTEGER;
BEGIN
  IF NEW.status = 'verified' AND OLD.status <> 'verified' THEN v_sign:= 1;
  ELSIF OLD.status = 'verified' AND NEW.status = 'voided' THEN v_sign:= -1;
  ELSE RETURN NEW; END IF;
SELECT * INTO s FROM sales WHERE id = NEW.sale_id;
v_code:= NEW.method;
  UPDATE sales SET paid_total = (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE sale_id = NEW.sale_id AND status = 'verified') WHERE id = NEW.sale_id;
  IF s.payment_condition = 'credit' AND s.customer_id IS NOT NULL THEN
    INSERT INTO credit_entries(company_id, customer_id, bucket, entry_type, amount, sale_id, payment_id, created_by)
VALUES(NEW.company_id, s.customer_id, 'pending', CASE WHEN v_sign = 1 THEN 'payment' ELSE 'adjust' END, -v_sign * NEW.amount, s.id, NEW.id, audit_ctx('user_id'):: BIGINT);
  END IF;
  IF v_code = 'favor' AND s.customer_id IS NOT NULL THEN
    INSERT INTO credit_entries(company_id, customer_id, bucket, entry_type, amount, sale_id, payment_id, created_by)
VALUES(NEW.company_id, s.customer_id, 'in_favor', CASE WHEN v_sign = 1 THEN 'apply' ELSE 'adjust' END, -v_sign * NEW.amount, s.id, NEW.id, audit_ctx('user_id'):: BIGINT);
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_payment_effects AFTER UPDATE OF status ON payments FOR EACH ROW EXECUTE FUNCTION payment_effects();

CREATE OR REPLACE FUNCTION credit_entry_guard() RETURNS trigger AS $$
DECLARE v_balance NUMERIC;
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'El libro de créditos no se modifica ni se borra'; END IF;
  SELECT COALESCE(SUM(amount), 0) INTO v_balance FROM credit_entries WHERE customer_id = NEW.customer_id AND bucket = NEW.bucket;
  IF v_balance + NEW.amount < 0 THEN
    RAISE EXCEPTION 'El saldo de % no puede quedar negativo', NEW.bucket USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_credit_entry_guard BEFORE INSERT OR UPDATE OR DELETE ON credit_entries FOR EACH ROW EXECUTE FUNCTION credit_entry_guard();

CREATE OR REPLACE FUNCTION return_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS(SELECT 1 FROM sales WHERE id = NEW.sale_id AND sale_at IS NOT NULL AND customer_id = NEW.customer_id) THEN
      RAISE EXCEPTION 'Solo se pueden devolver productos de una venta del mismo cliente';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.status <> 'pending' AND NEW.status IS DISTINCT FROM OLD.status THEN RAISE EXCEPTION 'La devolución ya fue %', OLD.status; END IF;
  IF NEW.status = 'approved' AND NEW.approved_by IS NOT NULL AND NOT user_can(NEW.approved_by, 'inventario', 'devoluciones', 'manage') THEN
    RAISE EXCEPTION 'El empleado no tiene permiso para aprobar devoluciones' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_return_guard BEFORE INSERT OR UPDATE OF status ON returns FOR EACH ROW EXECUTE FUNCTION return_guard();

CREATE OR REPLACE FUNCTION return_credit_effects() RETURNS trigger AS $$
BEGIN
  INSERT INTO credit_entries(company_id, customer_id, bucket, entry_type, amount, sale_id, return_id, reason, created_by)
VALUES(NEW.company_id, NEW.customer_id, 'in_favor', 'issue', NEW.total, NEW.sale_id, NEW.id, NEW.reason, audit_ctx('user_id'):: BIGINT);
  INSERT INTO stock_movements(stock_id, movement_type, quantity, document_type, document_id, created_by)
  SELECT si.stock_id, 'return_in', SUM(ri.quantity), 'return', NEW.id, audit_ctx('user_id'):: BIGINT
    FROM return_items ri JOIN sale_items si ON si.id = ri.sale_item_id WHERE ri.return_id = NEW.id AND ri.restock GROUP BY si.stock_id;
  UPDATE stock sl SET available = sl.available + x.q, updated_at = now()
FROM(SELECT si.stock_id, SUM(ri.quantity) AS q FROM return_items ri JOIN sale_items si ON si.id = ri.sale_item_id
           WHERE ri.return_id = NEW.id AND ri.restock GROUP BY si.stock_id) x WHERE sl.id = x.stock_id;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_return_credit AFTER UPDATE OF status ON returns FOR EACH ROW
WHEN(NEW.status = 'approved' AND OLD.status = 'pending') EXECUTE FUNCTION return_credit_effects();

--Purchases
CREATE OR REPLACE FUNCTION purchase_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF audit_ctx('user_id') IS NOT NULL AND NOT user_can(audit_ctx('user_id'):: BIGINT, 'inventario', 'ordenes_compra', 'manage') THEN
      RAISE EXCEPTION 'El usuario no tiene permiso para crear órdenes de compra' USING ERRCODE = '42501';
    END IF;
    IF NEW.status = 'received' THEN RAISE EXCEPTION 'Una compra no puede nacer recibida'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.status = 'ordered' AND OLD.status = 'draft' THEN
    IF audit_ctx('user_id') IS NOT NULL AND NOT user_can(audit_ctx('user_id'):: BIGINT, 'inventario', 'ordenes_compra', 'manage') THEN
      RAISE EXCEPTION 'El usuario no tiene permiso para aprobar órdenes de compra' USING ERRCODE = '42501';
    END IF;
NEW.approved_by := COALESCE(NEW.approved_by, audit_ctx('user_id'):: BIGINT);
NEW.approved_at := COALESCE(NEW.approved_at, now());
  END IF;
  IF NEW.status = 'received' AND OLD.status <> 'received' THEN
    IF audit_ctx('user_id') IS NOT NULL AND NOT user_can(audit_ctx('user_id'):: BIGINT, 'inventario', 'entradas_compra', 'manage') THEN
      RAISE EXCEPTION 'El usuario no tiene permiso para recibir compras' USING ERRCODE = '42501';
    END IF;
NEW.received_by := COALESCE(NEW.received_by, audit_ctx('user_id'):: BIGINT);
NEW.received_at := COALESCE(NEW.received_at, now());
  END IF;
  IF NEW.status = 'voided' AND OLD.status <> 'voided' THEN
    IF audit_ctx('user_id') IS NOT NULL AND NOT user_can(audit_ctx('user_id'):: BIGINT, 'inventario', 'entradas_compra', 'manage') THEN
      RAISE EXCEPTION 'El usuario no tiene permiso para anular compras' USING ERRCODE = '42501';
    END IF;
    IF length(trim(coalesce(NEW.void_reason, audit_ctx('reason'), ''))) = 0 THEN
      RAISE EXCEPTION 'Anular una compra exige un motivo';
    END IF;
    IF NEW.void_reason IS NULL THEN NEW.void_reason := audit_ctx('reason'); END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_purchase_guard BEFORE INSERT OR UPDATE ON purchases FOR EACH ROW EXECUTE FUNCTION purchase_guard();

CREATE OR REPLACE FUNCTION purchase_receive_effects() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'received' AND OLD.status <> 'received' THEN
    INSERT INTO stock(product_id, warehouse_id, location, available)
    SELECT pi.product_id, NEW.warehouse_id, '', SUM(pi.quantity)
    FROM purchase_items pi WHERE pi.purchase_id = NEW.id
    GROUP BY pi.product_id
    ON CONFLICT(product_id, warehouse_id, location) DO UPDATE
    SET available = stock.available + EXCLUDED.available, updated_at = now();
    INSERT INTO stock_movements(stock_id, movement_type, quantity, document_type, document_id, created_by)
    SELECT s.id, 'purchase_in', pi.q, 'purchase', NEW.id, COALESCE(NEW.received_by, NEW.created_by)
FROM(SELECT pi.product_id, SUM(pi.quantity) AS q FROM purchase_items pi WHERE pi.purchase_id = NEW.id GROUP BY pi.product_id) pi
    JOIN stock s ON s.product_id = pi.product_id AND s.warehouse_id = NEW.warehouse_id AND s.location = '';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_purchase_receive AFTER UPDATE OF status ON purchases FOR EACH ROW
WHEN(NEW.status = 'received' AND OLD.status <> 'received') EXECUTE FUNCTION purchase_receive_effects();

CREATE OR REPLACE FUNCTION count_verified_effects() RETURNS trigger AS $$
DECLARE r RECORD;
BEGIN
  IF NEW.status = 'verified' AND OLD.status <> 'verified' THEN
    FOR r IN SELECT stock_id, counted_qty - expected_qty AS diff FROM stock_count_items WHERE count_id = NEW.id AND counted_qty IS NOT NULL LOOP
      IF r.diff <> 0 THEN
        UPDATE stock SET available = available + r.diff, updated_at = now() WHERE id = r.stock_id;
        INSERT INTO stock_movements(stock_id, movement_type, quantity, document_type, document_id, created_by)
VALUES(r.stock_id, 'count_adjust', r.diff, 'count', NEW.id, NEW.created_by);
      END IF;
    END LOOP;
    UPDATE stock_counts SET closed_at = now() WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_count_verified AFTER UPDATE OF status ON stock_counts FOR EACH ROW
WHEN(NEW.status = 'verified' AND OLD.status <> 'verified') EXECUTE FUNCTION count_verified_effects();

CREATE OR REPLACE FUNCTION sale_invoice_auto() RETURNS trigger AS $$
DECLARE v_invoice_id BIGINT;
BEGIN
  IF NEW.sale_at IS NOT NULL AND OLD.sale_at IS NULL THEN
    INSERT INTO invoices(company_id, sale_id, dian_status)
VALUES(NEW.company_id, NEW.id, 'pending')
    RETURNING id INTO v_invoice_id;
    INSERT INTO siigo_outbox(company_id, entity, entity_id, operation, payload)
VALUES(NEW.company_id, 'invoice', v_invoice_id, 'create', jsonb_build_object('sale_id', NEW.id));
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_sale_invoice AFTER UPDATE OF sale_at ON sales FOR EACH ROW
WHEN(NEW.sale_at IS NOT NULL AND OLD.sale_at IS NULL) EXECUTE FUNCTION sale_invoice_auto();

CREATE OR REPLACE FUNCTION notify_order_status() RETURNS trigger AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO notifications(user_id, title, body)
    SELECT u.id, 'Pedido ' || NEW.serial_code || ' actualizado', 'Nuevo estado: ' || NEW.status
    FROM users u
    WHERE u.company_id = NEW.company_id AND u.user_type = 'employee' AND u.status = 'active'
      AND user_can(u.id, 'tienda', 'pedidos', 'view');
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_notify_order AFTER UPDATE OF status ON sales FOR EACH ROW EXECUTE FUNCTION notify_order_status();

--Realtime
CREATE OR REPLACE FUNCTION rt_emit(p_company BIGINT, p_warehouse BIGINT, p_user BIGINT, p_channel TEXT, p_type TEXT, p_entity TEXT, p_entity_id BIGINT, p_payload JSONB)
RETURNS BIGINT AS $$
DECLARE v_id BIGINT;
BEGIN
  INSERT INTO realtime_events(company_id, warehouse_id, user_id, channel, event_type, entity, entity_id, payload)
VALUES(p_company, p_warehouse, p_user, p_channel, p_type, p_entity, p_entity_id, COALESCE(p_payload, '{}':: jsonb))
  RETURNING id INTO v_id;
  PERFORM pg_notify('rt_events', jsonb_build_object('id', v_id, 'companyId', p_company, 'channel', p_channel):: text);
  RETURN v_id;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION rt_purge(p_hours INTEGER DEFAULT 48) RETURNS BIGINT AS $$
DECLARE v_n BIGINT;
BEGIN
  DELETE FROM realtime_events WHERE created_at < now() - make_interval(hours => p_hours);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION rt_stock_change() RETURNS trigger AS $$
DECLARE v_company BIGINT; v_payload JSONB; r RECORD;
BEGIN
  SELECT company_id INTO v_company FROM warehouses WHERE id = NEW.warehouse_id;
v_payload:= jsonb_build_object('stockId', NEW.id, 'productId', NEW.product_id, 'warehouseId', NEW.warehouse_id, 'location', NEW.location,
    'available', NEW.available, 'inCart', NEW.in_cart, 'reserved', NEW.reserved, 'sellable', NEW.available - NEW.in_cart - NEW.reserved);
  PERFORM rt_emit(v_company, NEW.warehouse_id, NULL, 'stock', 'stock.updated', 'stock', NEW.id, v_payload);
  FOR r IN SELECT borrower_company_id, borrower_product_id FROM stock_shares WHERE stock_id = NEW.id AND status = 'active' LOOP
    PERFORM rt_emit(r.borrower_company_id, NULL, NULL, 'stock', 'stock.updated', 'stock', NEW.id, v_payload || jsonb_build_object('productId', r.borrower_product_id));
  END LOOP;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rt_stock AFTER UPDATE ON stock FOR EACH ROW
WHEN(OLD.available IS DISTINCT FROM NEW.available OR OLD.in_cart IS DISTINCT FROM NEW.in_cart OR OLD.reserved IS DISTINCT FROM NEW.reserved)
  EXECUTE FUNCTION rt_stock_change();

CREATE OR REPLACE FUNCTION rt_sale_change() RETURNS trigger AS $$
DECLARE v_type TEXT; v_payload JSONB; v_channel TEXT:= CASE NEW.sale_type WHEN 'sale' THEN 'orders' ELSE 'transfers' END;
BEGIN
  IF TG_OP = 'INSERT' THEN v_type:= 'order.created';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN v_type:= 'order.' || NEW.status;
  ELSIF NEW.sale_at IS NOT NULL AND OLD.sale_at IS NULL THEN v_type:= 'order.became_sale';
  ELSE RETURN NEW; END IF;
v_payload:= jsonb_build_object('saleId', NEW.id, 'serial', NEW.serial_code, 'saleType', NEW.sale_type, 'status', NEW.status,
    'stage', NEW.current_stage, 'stageState', NEW.stage_state, 'paymentCondition', NEW.payment_condition, 'total', NEW.total);
  PERFORM rt_emit(NEW.company_id, NEW.warehouse_id, NULL, v_channel, v_type, 'sales', NEW.id, v_payload);
  IF NEW.sale_type = 'transfer' AND NEW.aux_warehouse_id IS NOT NULL THEN
    PERFORM rt_emit(NEW.company_id, NEW.aux_warehouse_id, NULL, v_channel, v_type, 'sales', NEW.id, v_payload);
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rt_sale AFTER INSERT OR UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION rt_sale_change();

CREATE OR REPLACE FUNCTION rt_stage_change() RETURNS trigger AS $$
DECLARE s sales%ROWTYPE; v_payload JSONB; v_channel TEXT;
BEGIN
  IF NEW.status = OLD.status AND NEW.assigned_to IS NOT DISTINCT FROM OLD.assigned_to THEN RETURN NEW; END IF;
SELECT * INTO s FROM sales WHERE id = NEW.sale_id;
v_channel:= CASE s.sale_type WHEN 'sale' THEN 'orders' ELSE 'transfers' END;
v_payload:= jsonb_build_object('saleId', s.id, 'serial', s.serial_code, 'stage', NEW.stage, 'status', NEW.status,
    'assignedTo', NEW.assigned_to, 'verifiedBy', NEW.verified_by);
  PERFORM rt_emit(s.company_id, s.warehouse_id, NULL, v_channel, 'order.stage_changed', 'sale_stages', NEW.id, v_payload);
  IF s.sale_type = 'transfer' AND s.aux_warehouse_id IS NOT NULL THEN
    PERFORM rt_emit(s.company_id, s.aux_warehouse_id, NULL, v_channel, 'order.stage_changed', 'sale_stages', NEW.id, v_payload);
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rt_stage AFTER UPDATE ON sale_stages FOR EACH ROW EXECUTE FUNCTION rt_stage_change();

CREATE OR REPLACE FUNCTION rt_payment_change() RETURNS trigger AS $$
DECLARE s sales%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = OLD.status THEN RETURN NEW; END IF;
SELECT * INTO s FROM sales WHERE id = NEW.sale_id;
  PERFORM rt_emit(NEW.company_id, s.warehouse_id, NULL, 'payments', CASE TG_OP WHEN 'INSERT' THEN 'payment.created' ELSE 'payment.' || NEW.status END,
    'payments', NEW.id, jsonb_build_object('paymentId', NEW.id, 'saleId', NEW.sale_id, 'serial', s.serial_code, 'status', NEW.status, 'amount', NEW.amount));
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rt_payment AFTER INSERT OR UPDATE OF status ON payments FOR EACH ROW EXECUTE FUNCTION rt_payment_change();

CREATE OR REPLACE FUNCTION rt_credit_change() RETURNS trigger AS $$
BEGIN
  PERFORM rt_emit(NEW.company_id, NULL, NULL, 'credit', 'credit.changed', 'credit_entries', NEW.id,
    jsonb_build_object('customerId', NEW.customer_id, 'bucket', NEW.bucket, 'type', NEW.entry_type, 'amount', NEW.amount));
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rt_credit AFTER INSERT ON credit_entries FOR EACH ROW EXECUTE FUNCTION rt_credit_change();

CREATE OR REPLACE FUNCTION rt_return_change() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = OLD.status THEN RETURN NEW; END IF;
  PERFORM rt_emit(NEW.company_id, NULL, NULL, 'returns', CASE TG_OP WHEN 'INSERT' THEN 'return.created' ELSE 'return.' || NEW.status END,
    'returns', NEW.id, jsonb_build_object('returnId', NEW.id, 'saleId', NEW.sale_id, 'status', NEW.status, 'total', NEW.total));
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rt_return AFTER INSERT OR UPDATE OF status ON returns FOR EACH ROW EXECUTE FUNCTION rt_return_change();

CREATE OR REPLACE FUNCTION rt_purchase_change() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = OLD.status THEN RETURN NEW; END IF;
  PERFORM rt_emit(NEW.company_id, NEW.warehouse_id, NULL, 'purchases',
    CASE TG_OP WHEN 'INSERT' THEN 'purchase.created' ELSE 'purchase.' || NEW.status END,
    'purchases', NEW.id, jsonb_build_object('purchaseId', NEW.id, 'serial', NEW.serial_code, 'status', NEW.status, 'total', NEW.total));
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rt_purchase AFTER INSERT OR UPDATE OF status ON purchases FOR EACH ROW EXECUTE FUNCTION rt_purchase_change();

CREATE OR REPLACE FUNCTION rt_notification() RETURNS trigger AS $$
BEGIN
  PERFORM rt_emit((SELECT company_id FROM users WHERE id = NEW.user_id), NULL, NEW.user_id, 'notifications', 'notification.created', 'notifications', NEW.id,
    jsonb_build_object('title', NEW.title));
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rt_notification AFTER INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION rt_notification();

--Convert cart to sale
CREATE OR REPLACE FUNCTION convert_cart_to_sale(
    p_cart_id BIGINT,
    p_serial_code TEXT,
    p_seller_id BIGINT,
    p_payment_method TEXT,
    p_price_level_id BIGINT,
    p_store_id BIGINT DEFAULT NULL,
    p_warehouse_id BIGINT DEFAULT NULL,
    p_customer_id BIGINT DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE v_cart carts%ROWTYPE; v_sale_id BIGINT; r RECORD; v_price NUMERIC; v_customer BIGINT;
BEGIN
SELECT * INTO v_cart FROM carts WHERE id = p_cart_id AND status = 'open' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Carrito no encontrado o no abierto'; END IF;
v_customer:= COALESCE(p_customer_id, v_cart.customer_id, get_inline_customer(v_cart.company_id));
  INSERT INTO sales(company_id, serial_code, customer_id, seller_id, warehouse_id, store_id, price_level_id, payment_method, created_by)
VALUES(v_cart.company_id, p_serial_code, v_customer, p_seller_id, COALESCE(p_warehouse_id, v_cart.warehouse_id), p_store_id, p_price_level_id, p_payment_method, p_seller_id)
  RETURNING id INTO v_sale_id;
  FOR r IN SELECT product_id, stock_id, quantity FROM cart_items WHERE cart_id = p_cart_id LOOP
    PERFORM stock_hold(v_cart.company_id, r.product_id, r.stock_id, 'in_cart', -r.quantity);
    SELECT get_product_price(r.product_id, p_price_level_id) INTO v_price;
    INSERT INTO sale_items(sale_id, product_id, stock_id, quantity, unit_price, tax_percent)
VALUES(v_sale_id, r.product_id, r.stock_id, r.quantity, COALESCE(v_price, 0),
    COALESCE((SELECT tax_percent FROM products WHERE id = r.product_id), 0));
  END LOOP;
  UPDATE carts SET status = 'converted' WHERE id = p_cart_id;
  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
    --13. VIEWS
-- ============================================================
    CREATE VIEW v_customer_credit AS
SELECT c.id AS customer_id, c.company_id, c.display_name, c.customer_type, c.credit_enabled, c.credit_limit,
    COALESCE(SUM(e.amount) FILTER(WHERE e.bucket = 'pending'), 0)  AS pending_credit,
        COALESCE(SUM(e.amount) FILTER(WHERE e.bucket = 'in_favor'), 0) AS credit_in_favor,
            c.credit_limit - COALESCE(SUM(e.amount) FILTER(WHERE e.bucket = 'pending'), 0) AS available_credit
FROM customers c LEFT JOIN credit_entries e ON e.customer_id = c.id
GROUP BY c.id;

CREATE VIEW v_stock AS
SELECT s.id AS stock_id, p.company_id, p.id AS product_id, p.code, p.name, s.warehouse_id, s.location,
    s.available, s.in_cart, s.reserved, s.available - s.in_cart - s.reserved AS sellable, p.virtual_stock
FROM stock s JOIN products p ON p.id = s.product_id;

CREATE VIEW v_stock_company AS
SELECT p.company_id, p.id AS product_id, p.code, p.name,
    COALESCE(SUM(s.available), 0)::int AS available,
        COALESCE(SUM(s.in_cart), 0)::int AS in_cart,
            COALESCE(SUM(s.reserved), 0)::int AS reserved,
                COALESCE(SUM(s.available - s.in_cart - s.reserved), 0)::int AS sellable,
                    p.virtual_stock
FROM products p LEFT JOIN stock s ON s.product_id = p.id
GROUP BY p.id;

CREATE VIEW v_virtual_stock AS
SELECT sw.store_id, s.product_id, SUM(s.available)::int AS available, SUM(s.in_cart)::int AS in_cart, SUM(s.reserved)::int AS reserved,
    SUM(s.available - s.in_cart - s.reserved)::int AS sellable
FROM store_warehouses sw JOIN stock s ON s.warehouse_id = sw.warehouse_id
GROUP BY sw.store_id, s.product_id;

CREATE VIEW v_locations AS
SELECT warehouse_id, location, COUNT(DISTINCT product_id)::int AS products, SUM(available)::int AS items
FROM stock WHERE location <> '' GROUP BY warehouse_id, location;

CREATE MATERIALIZED VIEW mv_sales_daily AS
SELECT company_id, DATE(sale_at) AS sale_date, COUNT(*) AS num_sales, SUM(total) AS total_sales
FROM sales WHERE sale_at IS NOT NULL AND status = 'completed'
GROUP BY company_id, DATE(sale_at);

CREATE VIEW v_inventory_valuation AS
SELECT p.company_id, s.product_id, p.name, SUM(s.available) AS total_qty,
    COALESCE(AVG(ps.cost), 0) AS avg_cost,
        SUM(s.available) * COALESCE(AVG(ps.cost), 0) AS total_value
FROM stock s JOIN products p ON p.id = s.product_id
LEFT JOIN product_suppliers ps ON ps.product_id = s.product_id
GROUP BY p.company_id, s.product_id, p.name;

-- ============================================================
    --14. AUDIT SEED + TRIGGERS
-- ============================================================
    INSERT INTO audit_actions(code, entity, description, requires_reason, is_sensitive) VALUES
        ('sale.cancel', 'sales', 'Cancelar un pedido', TRUE, FALSE),
        ('sale.stage_change', 'sale_stages', 'Avanzar una etapa del pedido', FALSE, FALSE),
        ('sale.stage_reject', 'sale_stages', 'Devolver una etapa para rehacerla', TRUE, FALSE),
        ('sale.to_sale', 'sales', 'El pedido pasa a ser venta (pago verificado)', FALSE, FALSE),
        ('quotation.convert', 'quotations', 'Convertir una cotización en pedido', FALSE, FALSE),
        ('payment.verify', 'payments', 'Verificar un pago o abono', FALSE, FALSE),
        ('payment.issue', 'payments', 'Marcar novedad en un pago', TRUE, FALSE),
        ('payment.void', 'payments', 'Anular un pago o abono', TRUE, FALSE),
        ('credit.adjust', 'credit_entries', 'Ajuste manual del crédito de un cliente', TRUE, TRUE),
        ('return.approve', 'returns', 'Aprobar una devolución (genera crédito a favor)', FALSE, FALSE),
        ('return.create', 'returns', 'Registrar una devolución', TRUE, FALSE),
        ('product.price_change', 'product_prices', 'Cambiar el precio de un producto', TRUE, FALSE),
        ('stock.adjust', 'stock', 'Ajustar existencias', TRUE, FALSE),
        ('stock_share.close', 'stock_shares', 'Cerrar un préstamo de stock entre compañías', TRUE, FALSE),
        ('customer.credit_change', 'customers', 'Cambiar el cupo de crédito', TRUE, FALSE),
        ('company.deactivate', 'companies', 'Desactivar una compañía', TRUE, TRUE),
        ('user.block', 'users', 'Bloquear un usuario', TRUE, TRUE),
        ('user.role_change', 'users', 'Cambiar el rol de un usuario', FALSE, TRUE),
        ('role.permission_change', 'role_permissions', 'Cambiar los permisos de un rol', FALSE, TRUE),
        ('invoice.annul', 'invoices', 'Anular una factura', TRUE, FALSE),
        ('purchase.create', 'purchases', 'Crear una orden de compra', FALSE, FALSE),
        ('purchase.approve', 'purchases', 'Aprobar una orden de compra', FALSE, FALSE),
        ('purchase.receive', 'purchases', 'Recibir una compra (entra stock)', FALSE, FALSE),
        ('purchase.void', 'purchases', 'Anular una compra', TRUE, FALSE),
        ('auth.login', 'users', 'Inicio de sesión', FALSE, FALSE),
        ('auth.login_failed', 'users', 'Intento de inicio de sesión fallido', FALSE, TRUE),
        ('audit.view', 'audit_events', 'Consultar la auditoría', FALSE, TRUE),
        ('audit.export', 'audit_events', 'Exportar la auditoría', TRUE, TRUE);

CREATE OR REPLACE FUNCTION audit_row_change() RETURNS trigger AS $$
DECLARE
  v_old JSONB; v_new JSONB; v_row JSONB; v_changed TEXT[];
  v_action TEXT; v_rule audit_actions%ROWTYPE; v_group TEXT;
  v_hidden TEXT[] := ARRAY['password_hash', 'access_key_enc'];
BEGIN
  IF TG_OP = 'INSERT' THEN
v_new:= to_jsonb(NEW) - v_hidden;
  ELSIF TG_OP = 'UPDATE' THEN
v_old:= to_jsonb(OLD) - v_hidden;
v_new:= to_jsonb(NEW) - v_hidden;
    SELECT array_agg(k) INTO v_changed FROM jsonb_object_keys(v_new) AS k
     WHERE v_new -> k IS DISTINCT FROM v_old -> k
       AND k NOT IN('updated_at', 'current_stage', 'stage_state', 'virtual_stock', 'display_name');
    IF v_changed IS NULL THEN RETURN NEW; END IF;
ELSE
v_old:= to_jsonb(OLD) - v_hidden;
  END IF;

v_row:= COALESCE(v_new, v_old);
v_action:= COALESCE(audit_ctx('action'), TG_TABLE_NAME || '.' || lower(TG_OP));
v_group:= audit_module_group(TG_TABLE_NAME);
SELECT * INTO v_rule FROM audit_actions WHERE code = v_action;
  IF FOUND AND v_rule.requires_reason AND audit_ctx('reason') IS NULL THEN
    RAISE EXCEPTION 'La acción % exige un motivo', v_action USING ERRCODE = '23514';
  END IF;

  INSERT INTO audit_events(module_group, company_id, user_id, user_name, role_code, action_code, entity, entity_id, entity_label,
    module, warehouse_id, store_id, device, ip_address, reason,
    before_data, after_data, changed_fields, request_id)
VALUES(v_group,
    COALESCE((v_row ->> 'company_id'):: BIGINT, CASE WHEN TG_TABLE_NAME = 'companies' THEN(v_row ->> 'id'):: BIGINT END, audit_ctx('company_id'):: BIGINT),
    audit_ctx('user_id'):: BIGINT,
    (SELECT full_name FROM users WHERE id = audit_ctx('user_id'):: BIGINT),
    audit_ctx('role'), v_action, TG_TABLE_NAME, (v_row ->> 'id'):: BIGINT,
        COALESCE(v_row ->> 'serial_code', v_row ->> 'display_name', v_row ->> 'name', v_row ->> 'code', v_row ->> 'email'),
        audit_ctx('module'), audit_ctx('warehouse_id'):: BIGINT, audit_ctx('store_id'):: BIGINT,
            audit_ctx('device'), audit_ctx('ip'):: INET, audit_ctx('reason'),
                v_old, v_new, v_changed, audit_ctx('request_id')::UUID);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION audit_record(p_action TEXT, p_entity TEXT, p_entity_id BIGINT, p_data JSONB DEFAULT NULL)
RETURNS VOID AS $$
DECLARE v_rule audit_actions%ROWTYPE; v_group TEXT;
BEGIN
v_group:= audit_module_group(p_entity);
SELECT * INTO v_rule FROM audit_actions WHERE code = p_action;
  IF FOUND AND v_rule.requires_reason AND audit_ctx('reason') IS NULL THEN
    RAISE EXCEPTION 'La acción % exige un motivo', p_action USING ERRCODE = '23514';
  END IF;
  INSERT INTO audit_events(module_group, company_id, user_id, user_name, role_code, action_code, entity, entity_id, module,
    warehouse_id, store_id, device, ip_address, reason, after_data, request_id)
VALUES(v_group, audit_ctx('company_id'):: BIGINT, audit_ctx('user_id'):: BIGINT,
    (SELECT full_name FROM users WHERE id = audit_ctx('user_id'):: BIGINT), audit_ctx('role'),
    p_action, p_entity, p_entity_id, audit_ctx('module'), audit_ctx('warehouse_id'):: BIGINT,
        audit_ctx('store_id'):: BIGINT, audit_ctx('device'), audit_ctx('ip'):: INET,
            audit_ctx('reason'), p_data, audit_ctx('request_id')::UUID);
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION audit_block_changes() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'La auditoría no se puede modificar ni borrar'; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_audit_no_update BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION audit_block_changes();
CREATE TRIGGER trg_audit_no_truncate BEFORE TRUNCATE ON audit_events FOR EACH STATEMENT EXECUTE FUNCTION audit_block_changes();

--audit_ensure_partitions: crea particiones mensuales por módulo on - demand
CREATE OR REPLACE FUNCTION audit_ensure_partitions(p_ahead INTEGER DEFAULT 2) RETURNS INTEGER AS $$
DECLARE
  v_month DATE; v_n INTEGER:= 0; i INTEGER;
  v_groups TEXT[] := ARRAY['tienda', 'caja', 'cartera', 'inventario', 'usuarios', 'terceros', 'siigo', 'companias', 'reportes', 'auditorias', 'sistema', 'other'];
  v_group TEXT; v_part TEXT;
BEGIN
  FOR i IN 0..p_ahead LOOP
v_month:= (date_trunc('month', now()) + make_interval(months => i)):: DATE;
    FOREACH v_group IN ARRAY v_groups LOOP
v_part:= format('audit_events_%s_%s', v_group, to_char(v_month, 'YYYY_MM'));
      IF to_regclass(v_part) IS NULL THEN
        EXECUTE format('CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
    v_part, 'audit_events_' || v_group, v_month, (v_month + interval '1 month')::DATE);
v_n:= v_n + 1;
      END IF;
    END LOOP;
  END LOOP;
  RETURN v_n;
END; $$ LANGUAGE plpgsql;

SELECT audit_ensure_partitions(2);

--Attach audit triggers to main tables
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'companies', 'company_brands', 'users', 'roles', 'role_permissions', 'customers', 'customer_discounts',
    'partners', 'products', 'product_prices', 'product_suppliers', 'price_levels',
    'warehouses', 'stores', 'stock_shares', 'sales', 'sale_stages', 'payments', 'purchases', 'returns', 'invoices', 'siigo_credentials']
LOOP
    EXECUTE format('CREATE TRIGGER trg_audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON %1$I FOR EACH ROW EXECUTE FUNCTION audit_row_change()', t);
  END LOOP;
END $$;

-- ============================================================
    --15. SEED · USERS(superadmin global + admin1 + 2 employees per role)
-- ============================================================
    --Superadmin: company_id = NULL, warehouse_id = NULL(V10 fix)
INSERT INTO warehouses(company_id, code, name, city) VALUES (1, 'BOD1', 'Bodega principal', 'Bogotá'), (1, 'BOD2', 'Bodega norte', 'Bogotá');
INSERT INTO users(company_id, role_id, email, password_hash, full_name, user_type, document, area)
SELECT NULL, r.id, 'superadminImportadora@gmail.com', crypt('123456', gen_salt('bf')),
    'Superadministrador Global', 'employee', 'EMP1000', 'superadmin'
FROM roles r WHERE r.code = 'superadmin' AND r.company_id = 1;

--Admin1(company 1)
INSERT INTO users(company_id, role_id, email, password_hash, full_name, user_type, document, area, warehouse_id)
SELECT 1, r.id, 'adminImportadora@gmail.com', crypt('123456', gen_salt('bf')),
    'Administrador Importadora', 'employee', 'EMP1001', 'admin', 1
FROM roles r WHERE r.code = 'admin' AND r.company_id = 1;

--2 empleados por rol(company 1)
INSERT INTO users(company_id, role_id, email, password_hash, full_name, user_type, document, area, warehouse_id)
SELECT 1, r.id, r.code || '1Importadora@gmail.com', crypt('123456', gen_salt('bf')),
    initcap(r.name) || ' 1 Importadora', 'employee', 'EMP1' || lpad(r.id:: text, 3, '0'), r.code, 1
FROM roles r
WHERE r.company_id = 1 AND r.code IN('vendedor', 'bodeguero', 'cajero', 'repartidor', 'administrativo');

INSERT INTO users(company_id, role_id, email, password_hash, full_name, user_type, document, area, warehouse_id)
SELECT 1, r.id, r.code || '2Importadora@gmail.com', crypt('123456', gen_salt('bf')),
    initcap(r.name) || ' 2 Importadora', 'employee', 'EMP2' || lpad(r.id:: text, 3, '0'), r.code, 1
FROM roles r
WHERE r.company_id = 1 AND r.code IN('vendedor', 'bodeguero', 'cajero', 'repartidor', 'administrativo');

--Admin2(company 2, único usuario de esa compañía)
INSERT INTO users(company_id, role_id, email, password_hash, full_name, user_type, document, area, warehouse_id)
SELECT 2, r.id, 'admin2Importadora@gmail.com', crypt('123456', gen_salt('bf')),
    'Administrador Importadora del Norte', 'employee', 'EMP2001', 'admin', NULL
FROM roles r WHERE r.code = 'admin' AND r.company_id = 2;

-- ============================================================
    --16. SEED · COMPANY 1 OPERATIONAL DATA(warehouses, stores, customers, catalog)
-- ============================================================
    -- Warehouses ya insertadas en §15 antes de los usuarios
        -- (warehouses ya insertadas en §15)
INSERT INTO stores(company_id, code, name, store_type) VALUES
    (1, 'TIENDA1', 'Tienda principal', 'physical'), (1, 'ONLINE', 'Tienda en línea', 'online'), (1, 'CORP', 'Corporativo', 'corporate');
INSERT INTO store_warehouses(store_id, warehouse_id, priority) VALUES(1, 1, 1), (2, 1, 1), (2, 2, 2), (3, 1, 1);

--Customers company 1(inline + final + natural + company)
INSERT INTO customers(
    company_id, is_inline, customer_type, document_type, document_number, check_digit,
    first_name, last_name, business_name, trade_name,
    legal_rep_name, legal_rep_document_type, legal_rep_document_number,
    tax_regime, economic_activity_code,
    email, phone, address, city, department,
    price_level_id, credit_enabled, credit_limit, status
) VALUES
    (1, TRUE, 'final_consumer', 'NIT', '222222222222', 0,
        NULL, NULL, 'Cliente de Línea', 'Cliente de Línea',
        NULL, NULL, NULL,
        'non_responsible', NULL,
        NULL, NULL, NULL, NULL, NULL,
        1, FALSE, 0, 'active'),
    (1, FALSE, 'final_consumer', 'NIT', '222222222222', 0,
        NULL, NULL, 'Consumidor Final', NULL,
        NULL, NULL, NULL,
        'non_responsible', NULL,
        NULL, NULL, NULL, NULL, NULL,
        1, FALSE, 0, 'active'),
    (1, FALSE, 'natural', 'CC', '1020304050', NULL,
        'Juan', 'Pérez Gómez', NULL, NULL,
        NULL, NULL, NULL,
        'simplified', NULL,
        'juan.perez@example.com', '3001234567', 'Calle 10 # 5-30', 'Bogotá', 'Cundinamarca',
        2, TRUE, 2000000, 'active'),
    (1, FALSE, 'company', 'NIT', '900123456', 7,
        NULL, NULL, 'Taller El Rápido S.A.S.', 'El Rápido',
        'María García', 'CC', '52876543',
        'responsible_iva', 'G4520',
        'contacto@elrapido.com', '6012345678', 'Carrera 45 # 12-10', 'Medellín', 'Antioquia',
        3, TRUE, 5000000, 'active');

--Catalog company 1
INSERT INTO brands(name) VALUES('Yamaha'), ('Suzuki'), ('Kawasaki'), ('Honda'), ('Kixx'), ('Shell'), ('Castrol'), ('Global Oil'), ('Mobil');
INSERT INTO company_brands(company_id, brand_id) SELECT 1, id FROM brands;
INSERT INTO partners(company_id, kind, nit, name, terms_days) VALUES
    (1, 'supplier', '800100001-1', 'Yamaha Motor Colombia', 30),
    (1, 'supplier', '800100002-2', 'Suzuki Colombia', 30),
    (1, 'supplier', '800100003-3', 'Kawasaki Colombia', 30),
    (1, 'supplier', '800100004-4', 'Lubricantes del Pacífico', 15);
INSERT INTO partners(company_id, kind, name, coverage) VALUES
    (1, 'carrier', 'Servientrega', 'Nacional'),
    (1, 'carrier', 'Envía', 'Nacional');
INSERT INTO categories(company_id, name) VALUES(1, 'ACEITE');
INSERT INTO models(company_id, name) VALUES(1, '15W40'), (1, '20W50'), (1, '10W30'), (1, 'ULTRA 4T');
INSERT INTO products(company_id, brand_id, category_id, model_id, code, name, description) VALUES
    (1, (SELECT id FROM brands WHERE name = 'Kixx'), 1, (SELECT id FROM models WHERE name = '15W40' AND company_id = 1), '8801470510011', 'ACEITE 15W40', NULL),
(1, (SELECT id FROM brands WHERE name = 'Shell'), 1, (SELECT id FROM models WHERE name = '20W50' AND company_id = 1), '5011987033207', 'ACEITE 20W50', NULL),
(1, (SELECT id FROM brands WHERE name = 'Castrol'), 1, (SELECT id FROM models WHERE name = '20W50' AND company_id = 1), '79191261187', 'ACEITE ACTEVO', 'ACTEVO'),
(1, (SELECT id FROM brands WHERE name = 'Global Oil'), 1, (SELECT id FROM models WHERE name = '20W50' AND company_id = 1), '7709252528579', 'ACEITE 20W50', NULL),
(1, (SELECT id FROM brands WHERE name = 'Honda'), 1, (SELECT id FROM models WHERE name = '10W30' AND company_id = 1), '7701234000011', 'ACEITE 10W30', NULL),
(1, (SELECT id FROM brands WHERE name = 'Kixx'), 1, (SELECT id FROM models WHERE name = 'ULTRA 4T' AND company_id = 1), '8801470510028', 'ACEITE ULTRA 4T', 'ULTRA 4T'),
(1, (SELECT id FROM brands WHERE name = 'Kixx'), 1, (SELECT id FROM models WHERE name = '20W50' AND company_id = 1), '8801470510035', 'ACEITE MAX 20W50', 'MAX'),
(1, (SELECT id FROM brands WHERE name = 'Mobil'), 1, (SELECT id FROM models WHERE name = '20W50' AND company_id = 1), '7709000112233', 'ACEITE SUPER 4T', 'SUPER 4T');

INSERT INTO product_prices(product_id, price_level_id, amount)
SELECT p.id, l.id, ROUND((p.id * 1500 + 20000) * (1 - l.position * 0.06), -2)
FROM products p CROSS JOIN price_levels l WHERE p.company_id = 1 AND l.company_id = 1;
INSERT INTO product_suppliers(product_id, supplier_id, cost)
SELECT p.id, (SELECT id FROM partners WHERE kind = 'supplier' AND name LIKE 'Lubricantes%' AND company_id = 1), 15000
FROM products p WHERE p.company_id = 1;

INSERT INTO stock(product_id, warehouse_id, location, available, min_stock)
SELECT p.id, 1, CASE WHEN p.id % 2 = 0 THEN '02-A03' ELSE '04-F01' END,
    CASE WHEN p.id IN(2, 4) THEN 0 ELSE 12 + p.id * 5 END, 5
FROM products p WHERE p.company_id = 1 ORDER BY p.id;
INSERT INTO stock(product_id, warehouse_id, location, available, min_stock)
SELECT id, 2, 'C-11', 12 + id * 5, 5 FROM products WHERE company_id = 1 AND id IN(1, 3) ORDER BY id;

INSERT INTO cash_registers(company_id, code, name, warehouse_id) VALUES
    (1, 'CAJA1', 'Caja Principal', 1);

--Recalcular virtual_stock tras seed
SELECT refresh_all_virtual_stocks();

COMMIT;