package bootstrap

// routes_guard_test · guardia contra rutas sin permiso: toda ruta que cambia datos debe exigir un permiso (o un tipo de actor), salvo la lista de excepciones
// conecta con: features/*/routes (lee sus archivos de texto), core/types/permission_types.go (catálogo) y la migración del catálogo;
// si se agrega una ruta nueva sin protegerla o con una llave que no existe, esta prueba falla

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"

	"importadoraApi/src/core/types"
)

// excepciones: rutas que cambian datos pero solo exigen sesión, y por qué
var unprotectedRoutes = map[string]string{
	"auth/routes/auth_routes.go":                  "inicio, renovación y cierre de sesión",
	"carts/routes/cart_routes.go":                 "el carrito es el espacio de trabajo personal de quien vende",
	"notifications/routes/notification_routes.go": "marcar notificaciones propias como leídas",
	"realtime/routes/realtime_routes.go":          "ticket del websocket: todo actor autenticado puede conectarse; lo que recibe se filtra por evento",
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

// lecturas que solo exigen sesión, por línea exacta, y por qué (8.3)
var unprotectedReads = map[string]string{
	`health/routes/health_routes.go|e.GET("/health", ctrl.Check)`:                  "sonda de salud del despliegue",
	`health/routes/health_routes.go|e.GET("/readiness", ctrl.Readiness)`:           "sonda de disponibilidad del despliegue",
	`swagger/routes/swagger_routes.go|group.GET("", ctrl.GetUI)`:                   "documentación de la API",
	`swagger/routes/swagger_routes.go|group.GET("/", ctrl.GetUI)`:                  "documentación de la API",
	`swagger/routes/swagger_routes.go|group.GET("/index.html", ctrl.GetUI)`:        "documentación de la API",
	`swagger/routes/swagger_routes.go|group.GET("/doc.json", ctrl.GetDoc)`:         "documentación de la API",
	`auth/routes/auth_routes.go|protected.GET("/me", ctrl.GetMe)`:                  "datos del propio usuario",
	`carts/routes/cart_routes.go|c.GET("/active", ctrl.GetActiveCart)`:             "carrito propio (el servicio exige que sea del actor)",
	`carts/routes/cart_routes.go|c.GET("/:id", ctrl.GetByID)`:                      "carrito propio (el servicio exige que sea del actor)",
	`notifications/routes/notification_routes.go|g.GET("", ctrl.List, recipients)`: "notificaciones propias",
	`screensaver/routes/screensaver_routes.go|protected.GET("", ctrl.Get)`:         "todos ven el protector de su compañía",
	`warehouses/routes/warehouse_routes.go|wh.GET("", ctrl.Get)`:                   "selector de bodega del encabezado: lo usa todo el que inicia sesión",
}

var readRoute = regexp.MustCompile(`\.GET\(`)

// TestEveryReadRouteIsProtected exige permiso también en las lecturas de negocio, salvo las excepciones justificadas.
func TestEveryReadRouteIsProtected(t *testing.T) {
	files, _ := filepath.Glob("../../features/*/routes/*_routes.go")
	seen := map[string]bool{}
	for _, file := range files {
		rel := filepath.ToSlash(strings.TrimPrefix(filepath.ToSlash(file), "../../features/"))
		content, _ := os.ReadFile(file)
		for i, line := range strings.Split(string(content), "\n") {
			trimmed := strings.TrimSpace(line)
			if !readRoute.MatchString(trimmed) || strings.HasPrefix(trimmed, "//") {
				continue
			}
			if strings.Contains(trimmed, "RequirePermission") || strings.Contains(trimmed, "RequireAnyPermission") || strings.Contains(trimmed, "RequireActors") {
				continue
			}
			key := rel + "|" + trimmed
			if _, ok := unprotectedReads[key]; ok {
				seen[key] = true
				continue
			}
			t.Errorf("%s:%d lee datos sin exigir permiso: %s", rel, i+1, trimmed)
		}
	}
	for key := range unprotectedReads {
		if !seen[key] {
			t.Errorf("la excepción %q ya no existe: quítala de unprotectedReads", key)
		}
	}
}

var permissionCall = regexp.MustCompile(`RequirePermission\("([a-z_]+)", *"([a-z_]+)"\)`)
var anyPermissionCall = regexp.MustCompile(`RequireAnyPermission\(([^)]*)\)`)
var quoted = regexp.MustCompile(`"([a-z_]+:[a-z_]+)"`)

// TestRoutePermissionsExistInCatalog falla si una ruta exige una llave que no está en el catálogo sembrado.
func TestRoutePermissionsExistInCatalog(t *testing.T) {
	catalog := types.PermissionCatalog()
	for _, k := range types.GovernancePermissions {
		catalog[k] = true
	}
	files, _ := filepath.Glob("../../features/*/routes/*_routes.go")
	for _, file := range files {
		content, _ := os.ReadFile(file)
		text := string(content)
		for _, m := range permissionCall.FindAllStringSubmatch(text, -1) {
			if key := m[1] + ":" + m[2]; !catalog[key] {
				t.Errorf("%s exige %s, que no está en core/types/permission_types.go", filepath.Base(file), key)
			}
		}
		for _, m := range anyPermissionCall.FindAllStringSubmatch(text, -1) {
			for _, q := range quoted.FindAllStringSubmatch(m[1], -1) {
				if !catalog[q[1]] {
					t.Errorf("%s exige %s, que no está en core/types/permission_types.go", filepath.Base(file), q[1])
				}
			}
		}
	}
}

// TestCatalogIsSeeded revisa que la migración del catálogo y startdb.pgsql siembren cada módulo y cada acción especial.
func TestCatalogIsSeeded(t *testing.T) {
	for _, file := range []string{"../db/migrations/20261128_permission-catalog.sql", "../db/startdb.pgsql"} {
		content, err := os.ReadFile(file)
		if err != nil {
			t.Fatalf("no se pudo leer %s: %v", file, err)
		}
		text := string(content)
		for module := range types.PermissionModules {
			if !strings.Contains(text, fmt.Sprintf("('%s', '", module)) {
				t.Errorf("%s no siembra el módulo %s", filepath.Base(file), module)
			}
		}
		for _, sp := range types.SpecialPermissions {
			module, action, _ := strings.Cut(sp.Key, ":")
			if !strings.Contains(text, fmt.Sprintf("('%s', '%s'", module, action)) {
				t.Errorf("%s no siembra la acción especial %s", filepath.Base(file), sp.Key)
			}
		}
	}
}
