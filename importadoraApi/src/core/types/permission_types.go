package types

// permission_types.go · catálogo final de permisos 'modulo:accion': única fuente de verdad de los nombres que exigen las rutas
// conecta con: core/bootstrap/routes_guard_test (falla si una ruta usa una llave que no está aquí o si la migración no la siembra),
// migrations/20261128_permission-catalog.sql y startdb.pgsql (siembran exactamente esta lista) y, en el front, employees.permissions.constants.ts
// ojo: change_status y update_prices se retiraron (8.2-8): el estado viaja en PUT/DELETE con edit/delete y los precios con edit_prices

// BaseActions son las acciones que tiene todo módulo operativo y que la matriz enciende por columna.
var BaseActions = []string{"view", "view_detail", "create", "edit", "delete"}

// PermissionModules son los módulos operativos con su etiqueta; cada uno lleva todas las BaseActions.
var PermissionModules = map[string]string{
	"catalog":    "Catálogo de la tienda",
	"quotations": "Cotizaciones",
	"orders":     "Pedidos y facturas",
	"cash":       "Caja",
	"returns":    "Devoluciones y garantías",
	"purchases":  "Compras",
	"suppliers":  "Proveedores y transportadoras",
	"products":   "Productos",
	"transfers":  "Traslados entre bodegas",
	"brands":     "Marcas",
	"categories": "Categorías",
	"models":     "Modelos",
	"stock":      "Inventario, conteos y ubicaciones",
	"credits":    "Créditos y cartera",
	"payments":   "Pagos y conciliación bancaria",
	"customers":  "Clientes",
	"employees":  "Empleados",
	"roles":      "Roles y permisos",
	"reports":    "Reportes",
	"audit":      "Auditoría y papelera",
	"warehouses": "Sedes y series de documentos",
	"invoices":   "Facturas de las cajas",
}

// SpecialPermission es una acción fuera de ver/crear/editar/borrar, con la llave de la que se hereda al migrar
// (quien hoy pasaba la ruta con esa llave conserva el acceso con la nueva).
type SpecialPermission struct {
	Key      string // modulo:accion
	Label    string
	Inherits []string // llaves actuales cuyos dueños la reciben en la migración
}

// SpecialPermissions son las acciones especiales del inventario de acciones por vista (docs/ACCIONES-POR-VISTA.md).
var SpecialPermissions = []SpecialPermission{
	{"products:edit_prices", "Productos · editar precios", []string{"products:edit_prices", "products:update_prices"}},
	{"catalog:edit_prices", "Catálogo de la tienda · editar precios", []string{"catalog:edit_prices", "catalog:update_prices"}},
	{"orders:verify_payment", "Pedidos · verificar el pago", []string{"orders:edit"}},
	{"orders:advance_stage", "Pedidos · avanzar etapa (alistar, empacar, despachar, entregar)", []string{"orders:edit"}},
	{"orders:invoice", "Pedidos · facturar", []string{"orders:edit"}},
	{"invoices:annul", "Facturas · anular", []string{"orders:delete"}},
	{"payments:verify", "Pagos · verificar, rechazar o reabrir abonos", []string{"payments:edit"}},
	{"payments:reconcile", "Pagos · conciliar extractos bancarios", []string{"payments:edit"}},
	{"cash:open_close", "Caja · abrir y cerrar turno", []string{"cash:create", "cash:edit"}},
	{"stock:relocate", "Inventario · reubicar productos", []string{"stock:edit"}},
	{"stock:count", "Inventario · registrar conteo físico", []string{"stock:create", "stock:edit"}},
	{"stock:count_verify", "Inventario · verificar y corroborar conteos", []string{"stock:edit"}},
	{"purchases:receive", "Compras · recibir mercancía", []string{"purchases:edit"}},
	{"transfers:receive", "Traslados · recibir", []string{"transfers:edit"}},
	{"returns:approve", "Devoluciones · aprobar o rechazar", []string{"returns:edit"}},
	{"reports:export", "Reportes · exportar a Excel", []string{"reports:view"}},
}

// GovernancePermissions son llaves que existen en las rutas pero no se siembran para empleados:
// solo las cumplen el admin de la compañía (pasa todo) y el superadmin (gobernanza).
var GovernancePermissions = []string{
	"screensaver:edit",
	"admins:view", // eventos del websocket de administradores (core/events: kind admin)
}

// PermissionCatalog devuelve el conjunto completo de llaves sembradas (módulos × BaseActions + especiales).
func PermissionCatalog() map[string]bool {
	out := make(map[string]bool, len(PermissionModules)*len(BaseActions)+len(SpecialPermissions))
	for module := range PermissionModules {
		for _, action := range BaseActions {
			out[module+":"+action] = true
		}
	}
	for _, sp := range SpecialPermissions {
		out[sp.Key] = true
	}
	return out
}
