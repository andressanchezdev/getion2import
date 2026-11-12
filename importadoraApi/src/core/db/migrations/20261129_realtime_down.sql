-- 20261129_realtime_down.sql
-- Deshace 20261129_realtime.sql si hay que retirar el tiempo real (PLAN-WEBSOCKET.md, E1 · Deshacer).
-- Las columnas updated_at y fn_set_updated_at() con clock_timestamp() se dejan: no hacen daño y otras partes ya las usan.
-- Antes de correrlo: apagar importadoraRealtime y poner REALTIME_EVENTS_ENABLED=false en la API.

BEGIN;

DROP TABLE IF EXISTS realtime_tickets;
DROP TABLE IF EXISTS realtime_events;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'importadora_realtime') THEN
        REVOKE ALL ON refresh_tokens, employees, admins, superadmins, employee_permissions, permissions, companies, warehouses FROM importadora_realtime;
        DROP ROLE importadora_realtime;
    END IF;
END $$;

COMMIT;
