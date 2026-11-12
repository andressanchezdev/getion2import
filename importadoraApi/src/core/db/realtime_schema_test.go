package db

// realtime_schema_test · revisa sin base de datos que el esquema del tiempo real (migración 20261129 y startdb.pgsql) esté completo y coincida
// conecta con: startdb.pgsql y migrations/20261129_realtime.sql (los lee como texto); plan: importadoraRealtime/PLAN-WEBSOCKET.md, E1
// ojo: no reemplaza las pruebas con base (pg_dump de base migrada contra base nueva, permisos del rol); esas se anotan en migrations/README.md

import (
	"os"
	"regexp"
	"strings"
	"testing"
)

func readSQL(t *testing.T, file string) string {
	t.Helper()
	raw, err := os.ReadFile(file)
	if err != nil {
		t.Fatalf("no se pudo leer %s: %v", file, err)
	}
	return strings.ReplaceAll(string(raw), "\r\n", "\n")
}

var createTable = regexp.MustCompile(`(?s)CREATE TABLE (?:IF NOT EXISTS )?(\w+) \((.*?)\n\);`)

// TestEveryVersionedTableHasTrigger: toda tabla con updated_at lo mantiene con fn_set_updated_at (la versión de los eventos)
func TestEveryVersionedTableHasTrigger(t *testing.T) {
	startdb := readSQL(t, "startdb.pgsql")
	versioned := 0
	for _, m := range createTable.FindAllStringSubmatch(startdb, -1) {
		table, body := m[1], m[2]
		if !regexp.MustCompile(`(?m)^\s+updated_at\s`).MatchString(body) {
			continue
		}
		versioned++
		trigger := "CREATE TRIGGER trg_" + table + "_updated_at\n    BEFORE UPDATE ON " + table + "\n    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();"
		if !strings.Contains(startdb, trigger) {
			t.Errorf("%s tiene updated_at pero no su trigger trg_%s_updated_at", table, table)
		}
	}
	if versioned < 34 {
		t.Errorf("solo %d tablas con updated_at; tras E1 deben ser al menos 34", versioned)
	}
}

// TestVersionUsesClockTimestamp: dos cambios en la misma transacción deben tener versiones distintas
func TestVersionUsesClockTimestamp(t *testing.T) {
	for _, file := range []string{"startdb.pgsql", "migrations/20261129_realtime.sql"} {
		sql := readSQL(t, file)
		fn := sql[strings.Index(sql, "CREATE OR REPLACE FUNCTION fn_set_updated_at()"):]
		fn = fn[:strings.Index(fn, "LANGUAGE plpgsql")]
		if !strings.Contains(fn, "clock_timestamp()") || strings.Contains(fn, "CURRENT_TIMESTAMP") {
			t.Errorf("%s: fn_set_updated_at debe usar clock_timestamp()", file)
		}
	}
}

// TestRealtimeTablesMatchMigration: realtime_events y realtime_tickets son idénticas en la migración y en startdb.pgsql
func TestRealtimeTablesMatchMigration(t *testing.T) {
	startdb := readSQL(t, "startdb.pgsql")
	migration := readSQL(t, "migrations/20261129_realtime.sql")
	for _, table := range []string{"realtime_events", "realtime_tickets"} {
		find := func(sql string) string {
			for _, m := range createTable.FindAllStringSubmatch(sql, -1) {
				if m[1] == table {
					return m[2]
				}
			}
			return ""
		}
		inStartdb, inMigration := find(startdb), find(migration)
		if inMigration == "" || inStartdb != inMigration {
			t.Errorf("%s no es igual en startdb.pgsql y en la migración", table)
		}
	}
	events := migration[strings.Index(migration, "CREATE TABLE IF NOT EXISTS realtime_events"):]
	for _, column := range []string{"tx_id           xid8 NOT NULL DEFAULT pg_current_xact_id()", "permissions     TEXT[]", "warehouse_ids   BIGINT[]", "actor_channel", "platform", "correlation_id", "payload         JSONB NOT NULL"} {
		if !strings.Contains(events, column) {
			t.Errorf("realtime_events no tiene %q", column)
		}
	}
}

// TestRealtimeRoleIsLeastPrivilege: el usuario del servicio solo lee, marca tickets y purga; nunca escribe datos de negocio
func TestRealtimeRoleIsLeastPrivilege(t *testing.T) {
	for _, file := range []string{"startdb.pgsql", "migrations/20261129_realtime.sql"} {
		sql := readSQL(t, file)
		grants := regexp.MustCompile(`(?m)^GRANT (.+) TO importadora_realtime;$`).FindAllStringSubmatch(sql, -1)
		got := make([]string, 0, len(grants))
		for _, g := range grants {
			got = append(got, g[1])
		}
		want := []string{
			"SELECT, DELETE ON realtime_events",
			"SELECT, DELETE ON realtime_tickets",
			"UPDATE (used_at) ON realtime_tickets",
			"SELECT ON refresh_tokens, employees, admins, superadmins, employee_permissions, permissions, companies, warehouses",
		}
		if strings.Join(got, "|") != strings.Join(want, "|") {
			t.Errorf("%s: permisos de importadora_realtime distintos a los del plan:\n%v", file, got)
		}
		if strings.Contains(sql, "importadora_realtime PASSWORD") && !strings.Contains(sql, "PASSWORD '…'") {
			t.Errorf("%s: la contraseña del rol no va en el script", file)
		}
	}
}
