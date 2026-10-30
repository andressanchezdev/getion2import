package main

import (
	"fmt"
	"os"
	"strings"
)

func main() {
	startdbBytes, err := os.ReadFile(`src\core\db\startdb.pgsql`)
	if err != nil {
		fmt.Println("Error reading startdb:", err)
		return
	}
	seedBytes, err := os.ReadFile(`src\core\db\seed_demo_data.pgsql`)
	if err != nil {
		fmt.Println("Error reading seed:", err)
		return
	}

	startdbContent := string(startdbBytes)
	marker := "-- ============================================================\n-- PARTE 4: DATOS SEMILLA INICIALES (SEED DATA)"
	idx := strings.Index(startdbContent, marker)
	if idx == -1 {
		marker = "-- PARTE 4: DATOS SEMILLA INICIALES"
		idx = strings.Index(startdbContent, marker)
	}
	if idx == -1 {
		fmt.Println("Marker not found!")
		return
	}

	ddlPart := startdbContent[:idx]

	seedContent := string(seedBytes)
	// Remove BEGIN; and COMMIT; from seed if ddlPart already has or we can include BEGIN...COMMIT
	// In startdb, let's keep clean BEGIN; ... COMMIT; for the whole file or seed part.

	newFull := ddlPart + "\n-- ============================================================\n-- PARTE 4: DATOS SEMILLA LIMPIOS DE OPERACIÓN (SEED DEMO)\n-- ============================================================\n\n" + seedContent

	err = os.WriteFile(`src\core\db\startdb.pgsql`, []byte(newFull), 0644)
	if err != nil {
		fmt.Println("Error writing startdb:", err)
		return
	}
	fmt.Println("Successfully consolidated startdb.pgsql with full schema + seed data!")
}
