package utils

// fuzzy.go · arma el trozo SQL de búsqueda tolerante a errores de ortografía (pg_trgm)
// conecta con: los repositorios de clientes, productos, empleados y terceros (lo usan en su List); necesita los índices trigram de startdb.pgsql

import (
	"fmt"
	"strings"
)

// FuzzyOr devuelve el trozo SQL " OR <término> <% columna ..." que tolera errores de ortografía (pg_trgm), o "" si no se pide.
// ojo: primero se busca exacto (ILIKE, con índice); la búsqueda aproximada es solo el respaldo cuando no hubo resultados
func FuzzyOr(enabled bool, argIdx int, cols ...string) string {
	if !enabled {
		return ""
	}
	var b strings.Builder
	for _, c := range cols {
		fmt.Fprintf(&b, " OR btrim($%d::text, '%%') <%% %s", argIdx, c)
	}
	return b.String()
}
