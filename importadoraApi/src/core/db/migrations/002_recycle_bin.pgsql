-- ============================================================
-- MIGRACIÓN 002: PAPELERA DE RECICLAJE Y RESTAURACIÓN (RECYCLE_BIN)
-- ============================================================

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

