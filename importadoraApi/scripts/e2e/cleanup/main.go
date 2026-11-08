// cleanup · borra de la base LOCAL todas las compañías que crean las pruebas E2E («Compania … E2E …») con todo lo suyo
// uso (con las variables de .env cargadas): go run ./scripts/e2e/cleanup
// ojo: solo para bases locales o de pruebas; no toca IMPORTADORA PREMIUM ni al superadmin; al terminar revisa que no queden filas huérfanas
package main

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/jackc/pgx/v5"
)

type foreignKey struct{ column, parent string }

func main() {
	ctx := context.Background()
	url := fmt.Sprintf("postgres://%s:%s@%s:%s/%s", os.Getenv("DB_USER"), os.Getenv("DB_PASSWORD"), os.Getenv("DB_HOST"), os.Getenv("DB_PORT"), os.Getenv("DB_DATABASE"))
	conn, err := pgx.Connect(ctx, url)
	if err != nil {
		fmt.Println("no se pudo conectar:", err)
		os.Exit(1)
	}
	defer conn.Close(ctx)

	tx, err := conn.Begin(ctx)
	if err != nil {
		panic(err)
	}
	defer tx.Rollback(ctx)

	ids := queryIDs(ctx, tx, "SELECT id FROM companies WHERE name LIKE '%E2E%' OR name LIKE 'Compania %'")
	fmt.Println("compañías de prueba:", len(ids))
	if len(ids) == 0 {
		return
	}

	withCompany := queryStrings(ctx, tx, "SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='company_id'")
	tables := queryStrings(ctx, tx, "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")
	fks := foreignKeys(ctx, tx)

	// condición de pertenencia de una tabla a las compañías de prueba: por company_id o, si no lo tiene, por la llave foránea hacia una tabla que sí
	var belongs func(table string, visiting map[string]bool) string
	belongs = func(table string, visiting map[string]bool) string {
		if table == "companies" {
			return "id = ANY($1)"
		}
		if withCompany[table] {
			return "company_id = ANY($1)"
		}
		if visiting[table] {
			return ""
		}
		visiting[table] = true
		defer delete(visiting, table)
		var parts []string
		for _, fk := range fks[table] {
			if fk.parent == table {
				continue
			}
			if cond := belongs(fk.parent, visiting); cond != "" {
				parts = append(parts, fmt.Sprintf("%s IN (SELECT id FROM %s WHERE %s)", fk.column, fk.parent, cond))
			}
		}
		return strings.Join(parts, " OR ")
	}

	// con los triggers de llaves foráneas apagados el orden de borrado no importa
	if _, err := tx.Exec(ctx, "SET LOCAL session_replication_role = replica"); err != nil {
		fmt.Println("se necesita un usuario con permiso para apagar los triggers:", err)
		os.Exit(1)
	}
	deleted := 0
	for table := range tables {
		cond := belongs(table, map[string]bool{})
		if cond == "" {
			continue
		}
		tag, err := tx.Exec(ctx, fmt.Sprintf("DELETE FROM %s WHERE %s", table, cond), ids)
		if err != nil {
			fmt.Println("error borrando", table, err)
			os.Exit(1)
		}
		deleted += int(tag.RowsAffected())
	}

	// lo que cuelga de filas ya borradas y no tiene company_id propio (renglones, sesiones, notificaciones...)
	for pass := 0; pass < 3; pass++ {
		for table, list := range fks {
			if withCompany[table] || table == "companies" {
				continue
			}
			for _, fk := range list {
				tag, err := tx.Exec(ctx, fmt.Sprintf("DELETE FROM %s t WHERE t.%s IS NOT NULL AND NOT EXISTS (SELECT 1 FROM %s p WHERE p.id = t.%s)", table, fk.column, fk.parent, fk.column))
				if err == nil {
					deleted += int(tag.RowsAffected())
				}
			}
		}
	}
	if err := tx.Commit(ctx); err != nil {
		fmt.Println("no se pudo confirmar:", err)
		os.Exit(1)
	}
	fmt.Println("filas borradas:", deleted)
}

func queryIDs(ctx context.Context, tx pgx.Tx, sql string) []int64 {
	rows, err := tx.Query(ctx, sql)
	if err != nil {
		panic(err)
	}
	defer rows.Close()
	var ids []int64
	for rows.Next() {
		var id int64
		_ = rows.Scan(&id)
		ids = append(ids, id)
	}
	return ids
}

func queryStrings(ctx context.Context, tx pgx.Tx, sql string) map[string]bool {
	rows, err := tx.Query(ctx, sql)
	if err != nil {
		panic(err)
	}
	defer rows.Close()
	set := map[string]bool{}
	for rows.Next() {
		var value string
		_ = rows.Scan(&value)
		set[value] = true
	}
	return set
}

func foreignKeys(ctx context.Context, tx pgx.Tx) map[string][]foreignKey {
	rows, err := tx.Query(ctx, `SELECT cl.relname, a.attname, pcl.relname
		FROM pg_constraint k JOIN pg_class cl ON cl.oid = k.conrelid JOIN pg_class pcl ON pcl.oid = k.confrelid
		JOIN pg_attribute a ON a.attrelid = k.conrelid AND a.attnum = k.conkey[1]
		WHERE k.contype = 'f' AND array_length(k.conkey, 1) = 1 AND cl.relnamespace = 'public'::regnamespace`)
	if err != nil {
		panic(err)
	}
	defer rows.Close()
	result := map[string][]foreignKey{}
	for rows.Next() {
		var table, column, parent string
		_ = rows.Scan(&table, &column, &parent)
		result[table] = append(result[table], foreignKey{column, parent})
	}
	return result
}
