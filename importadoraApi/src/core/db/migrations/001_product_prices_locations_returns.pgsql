-- ============================================================
-- MIGRACIÓN 001: PRECIOS DINÁMICOS, UBICACIONES Y DEVOLUCIONES
-- ============================================================

-- 1. Crear tabla product_prices
CREATE TABLE IF NOT EXISTS product_prices (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    product_id      BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price_tier      VARCHAR(30) NOT NULL,
    price           NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (product_id, price_tier)
);
CREATE INDEX IF NOT EXISTS idx_product_prices_product ON product_prices (product_id);
CREATE INDEX IF NOT EXISTS idx_product_prices_company_tier ON product_prices (company_id, price_tier);

-- 2. Migrar precios existentes desde products.prices si la columna existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'prices'
    ) THEN
        INSERT INTO product_prices (company_id, product_id, price_tier, price)
        SELECT p.company_id, p.id, kv.key, COALESCE((kv.value)::text::numeric, 0)
        FROM products p,
        LATERAL jsonb_each(p.prices) kv
        ON CONFLICT (product_id, price_tier) DO UPDATE
        SET price = EXCLUDED.price;

        ALTER TABLE products DROP COLUMN prices;
    END IF;
END $$;

-- 3. Crear tabla warehouse_locations
CREATE TABLE IF NOT EXISTS warehouse_locations (
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
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_lookup ON warehouse_locations (warehouse_id, is_active);

-- 4. Agregar vigencia de documentos a customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS docs_validity_months INTEGER NOT NULL DEFAULT 12 CHECK (docs_validity_months > 0);

-- 5. Ampliar tabla returns con causales y resolución
ALTER TABLE returns ADD COLUMN IF NOT EXISTS reason_type VARCHAR(20) NOT NULL DEFAULT 'warranty' CHECK (reason_type IN ('warranty', 'wrong_item'));
ALTER TABLE returns ADD COLUMN IF NOT EXISTS resolution_type VARCHAR(20) NOT NULL DEFAULT 'credit_balance' CHECK (resolution_type IN ('exchange', 'credit_balance'));
ALTER TABLE returns ADD COLUMN IF NOT EXISTS replacement_product_id BIGINT REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS replacement_stock_id BIGINT REFERENCES stock(id) ON DELETE SET NULL;

-- 6. Actualizar vista v_warehouse_stock con agregación dinámica de product_prices
CREATE OR REPLACE VIEW v_warehouse_stock AS
SELECT
    s.id AS stock_id,
    s.company_id,
    s.warehouse_id,
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

