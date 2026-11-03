package bootstrap

// routes_guard_test · guardia contra rutas sin permiso: toda ruta que cambia datos debe exigir un permiso (o un tipo de actor), salvo la lista de excepciones
// conecta con: features/*/routes (lee sus archivos de texto); si se agrega una ruta nueva sin protegerla, esta prueba falla

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// excepciones: rutas que cambian datos pero solo exigen sesión, y por qué
var unprotectedRoutes = map[string]string{
	"auth/routes/auth_routes.go":                  "inicio, renovación y cierre de sesión",
	"carts/routes/cart_routes.go":                 "el carrito es el espacio de trabajo personal de quien vende",
	"notifications/routes/notification_routes.go": "marcar notificaciones propias como leídas",
}

var writeRoute = regexp.MustCompile(`\.(POST|PUT|PATCH|DELETE)\(`)

// TestEveryWriteRouteIsProtected recorre los archivos de rutas y revisa cada ruta que cambia datos.
func TestEveryWriteRouteIsProtected(t *testing.T) {
	files, err := filepath.Glob("../../features/*/routes/*_routes.go")
	if err != nil || len(files) == 0 {
		t.Fatalf("no se encontraron archivos de rutas (%v)", err)
	}
	for _, file := range files {
		rel := filepath.ToSlash(strings.TrimPrefix(filepath.ToSlash(file), "../../features/"))
		if _, ok := unprotectedRoutes[rel]; ok {
			continue
		}
		content, err := os.ReadFile(file)
		if err != nil {
			t.Fatal(err)
		}
		for i, line := range strings.Split(string(content), "\n") {
			if writeRoute.MatchString(line) && !strings.Contains(line, "RequirePermission") && !strings.Contains(line, "RequireActors") {
				t.Errorf("%s:%d cambia datos sin exigir permiso: %s", rel, i+1, strings.TrimSpace(line))
			}
		}
	}
}

// TestSensitiveReadsAreProtected revisa que las lecturas de personal, auditoría, reportes y dinero también exijan permiso.
func TestSensitiveReadsAreProtected(t *testing.T) {
	sensitive := []string{"audit/routes", "payments/routes", "reports/routes", "wallet/routes", "recyclebin/routes", "bank_statements/routes", "purchases/routes", "returns/routes"}
	for _, dir := range sensitive {
		files, _ := filepath.Glob("../../features/" + dir + "/*_routes.go")
		if len(files) == 0 {
			t.Fatalf("no se encontraron rutas en %s", dir)
		}
		for _, file := range files {
			content, _ := os.ReadFile(file)
			for i, line := range strings.Split(string(content), "\n") {
				if strings.Contains(line, ".GET(") && !strings.Contains(line, "RequirePermission") {
					t.Errorf("%s:%d lee datos sensibles sin exigir permiso: %s", dir, i+1, strings.TrimSpace(line))
				}
			}
		}
	}
}
