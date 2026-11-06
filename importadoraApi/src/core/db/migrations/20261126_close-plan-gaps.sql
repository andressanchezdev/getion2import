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

COMMIT;
