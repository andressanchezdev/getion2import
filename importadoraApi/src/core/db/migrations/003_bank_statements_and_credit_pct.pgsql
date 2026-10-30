-- ============================================================================
-- MIGRACIÓN 003: MÓDULO DE EXTRACTOS BANCARIOS Y PORCENTAJE DE ADVERTENCIA DE CRÉDITO
-- ============================================================================

-- 1. Agregar porcentaje de advertencia de crédito en customers (default 70%)
ALTER TABLE customers 
    ADD COLUMN IF NOT EXISTS credit_warning_pct NUMERIC(5,2) DEFAULT 70.00
    CHECK (credit_warning_pct >= 0 AND credit_warning_pct <= 100);

COMMENT ON COLUMN customers.credit_warning_pct IS 'Porcentaje de ocupación de crédito a partir del cual el sistema emite una advertencia preventiva al vendedor';

-- 2. Tabla para almacenar los registros de extractos bancarios para el careo administrativo
CREATE TABLE IF NOT EXISTS bank_statement_records (
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
    confirmed_by_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
    confirmed_at        TIMESTAMPTZ,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bank_stmt_filter ON bank_statement_records (company_id, movement_date, status);
CREATE INDEX IF NOT EXISTS idx_bank_stmt_desc ON bank_statement_records USING gin (description gin_trgm_ops);

