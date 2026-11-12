package events

// catalog.go · enrutamiento por defecto de cada tipo: a qué canales va (compañía, bodegas, actor, plataforma) y qué permisos exige
// conecta con: types.go y constructors.go (aplican esta tabla); catalog_test.go exige que TODO Type y TODO Kind tengan entrada y que los
// permisos existan en el catálogo sembrado (core/types/permission_types.go)
// ojo: los permisos son de LECTURA (basta uno); el admin de la compañía pasa todos y el superadmin solo recibe el canal platform (decisión 2)

// route dice a qué canales va un tipo y con qué permisos. System: lo genera importadoraRealtime (la API no lo emite).
type route struct {
	Company, Warehouses, Actor, Platform, System bool
	Permissions                                  []string
}

// kindRoute es el canal y los permisos de un dato maestro (los usan los entity.*).
type kindRoute struct {
	Warehouse   bool // canal warehouse:{id} en vez de company:{id}
	Platform    bool // también al canal platform (superadmins)
	Permissions []string
}

// entityRoutes: una entrada por cada Kind de datos maestros (tabla 6.3-C del plan)
var entityRoutes = map[Kind]kindRoute{
	KindCompany:             {Platform: true},                                       // todos los de la compañía ven su estado
	KindAdmin:               {Platform: true, Permissions: []string{"admins:view"}}, // solo admin y superadmin (admins:view no se siembra a empleados)
	KindWarehouse:           {Permissions: []string{"warehouses:view", "transfers:view", "stock:view"}},
	KindWarehouseBilling:    {Permissions: []string{"warehouses:view", "invoices:view"}},
	KindDocSeries:           {Permissions: []string{"warehouses:view"}},
	KindLocation:            {Warehouse: true, Permissions: []string{"stock:view", "transfers:view", "transfers:create", "products:view", "purchases:view"}},
	KindCustomer:            {Permissions: []string{"customers:view", "orders:create", "quotations:view", "credits:view"}},
	KindCustomerDocument:    {Permissions: []string{"customers:view"}},
	KindSupplier:            {Permissions: []string{"suppliers:view", "purchases:view"}},
	KindCarrier:             {Permissions: []string{"suppliers:view", "purchases:view"}},
	KindBrand:               {Permissions: []string{"brands:view", "products:view", "catalog:view"}},
	KindCategory:            {Permissions: []string{"categories:view", "products:view", "catalog:view"}},
	KindModel:               {Permissions: []string{"models:view", "products:view", "catalog:view"}},
	KindProduct:             {Permissions: []string{"products:view", "catalog:view", "stock:view", "transfers:view", "purchases:view"}},
	KindProductCode:         {Permissions: []string{"products:view", "catalog:view"}},
	KindProductSupplier:     {Permissions: []string{"products:view", "purchases:view"}},
	KindRole:                {Permissions: []string{"roles:view", "employees:view"}},
	KindEmployee:            {Permissions: []string{"employees:view"}},
	KindScreensaverSettings: {}, // todos lo usan
}

var (
	ordersReaders = []string{"orders:view", "cash:view"}
	cashReaders   = []string{"cash:view", "invoices:view"}
)

// routes: una entrada por cada uno de los 48 tipos (sección 6.3 del plan). Los entity.* toman canal y permisos de entityRoutes.
var routes = map[Type]route{
	// A · sistema
	SystemWelcome: {System: true}, SystemReplayCompleted: {System: true}, SystemResyncRequired: {System: true}, SystemWatermark: {System: true},
	// B · sesión y acceso (canal personal)
	SessionRevoked: {Actor: true}, PermissionsChanged: {Actor: true}, AccountUpdated: {Actor: true},
	// C · datos maestros (canal y permisos por kind)
	EntityCreated: {Company: true}, EntityUpdated: {Company: true}, EntityStatusChanged: {Company: true},
	EntityArchived: {Company: true}, EntityRestored: {Company: true}, EntityDeleted: {Company: true},
	// D · precios
	ProductPricesChanged: {Company: true, Permissions: []string{"catalog:view", "products:view", "quotations:view"}},
	// E · inventario
	StockChanged:          {Company: true, Permissions: []string{"catalog:view", "stock:view", "transfers:view", "products:view"}},
	TransferCreated:       {Warehouses: true, Permissions: []string{"transfers:view"}},
	TransferStatusChanged: {Warehouses: true, Permissions: []string{"transfers:view"}},
	CountCreated:          {Warehouses: true, Permissions: []string{"stock:view"}},
	CountProgressChanged:  {Warehouses: true, Permissions: []string{"stock:view"}},
	CountStatusChanged:    {Warehouses: true, Permissions: []string{"stock:view"}},
	// F · ventas
	CartUpdated:            {Actor: true},
	QuotationCreated:       {Company: true, Permissions: []string{"quotations:view"}},
	QuotationUpdated:       {Company: true, Permissions: []string{"quotations:view"}},
	QuotationStatusChanged: {Company: true, Permissions: []string{"quotations:view"}},
	SaleCreated:            {Warehouses: true, Permissions: []string{"orders:view", "invoices:view", "cash:view"}},
	SaleStageChanged:       {Warehouses: true, Permissions: ordersReaders},
	SalePaymentChanged:     {Warehouses: true, Permissions: ordersReaders},
	InvoiceIssued:          {Warehouses: true, Permissions: []string{"invoices:view", "orders:view"}},
	InvoiceAnnulled:        {Warehouses: true, Permissions: []string{"invoices:view", "orders:view"}},
	// G · pagos, cartera y conciliación
	PaymentCreated:          {Company: true, Permissions: []string{"payments:view", "credits:view"}},
	PaymentStatusChanged:    {Company: true, Permissions: []string{"payments:view", "credits:view"}},
	CreditBalanceChanged:    {Company: true, Permissions: []string{"credits:view", "customers:view", "orders:create"}},
	BankStatementImported:   {Company: true, Permissions: []string{"payments:view"}},
	BankRecordStatusChanged: {Company: true, Permissions: []string{"payments:view"}},
	// H · caja
	CashSessionStatusChanged: {Warehouses: true, Permissions: cashReaders},
	CashSessionTotalsChanged: {Warehouses: true, Permissions: []string{"cash:view"}},
	CashExpenseRecorded:      {Warehouses: true, Permissions: cashReaders},
	// I · compras
	PurchaseCreated:         {Warehouses: true, Permissions: []string{"purchases:view"}},
	PurchaseStatusChanged:   {Warehouses: true, Permissions: []string{"purchases:view"}},
	PurchasePaymentRecorded: {Warehouses: true, Permissions: []string{"purchases:view", "cash:view"}},
	SupplierCatalogImported: {Company: true, Permissions: []string{"purchases:view", "products:view"}},
	// J · devoluciones
	ReturnCreated:       {Warehouses: true, Permissions: []string{"returns:view"}},
	ReturnStatusChanged: {Warehouses: true, Permissions: []string{"returns:view", "orders:view"}},
	// K · notificaciones (personales), auditoría y respaldos (plataforma)
	NotificationCreated: {Actor: true}, NotificationRead: {Actor: true},
	AuditLogged:    {Company: true, Permissions: []string{"audit:view"}}, // sin compañía va a platform (lo decide el constructor)
	BackupCreated:  {Platform: true},
	BackupRestored: {Platform: true},
}

// RouteFor devuelve el enrutamiento de un tipo (para entity.* combina el canal y los permisos de su kind).
func RouteFor(t Type, k Kind) route {
	r := routes[t]
	if kr, ok := entityRoutes[k]; ok && isEntityType(t) {
		r.Permissions = kr.Permissions
		r.Platform = kr.Platform
		if kr.Warehouse {
			r.Company, r.Warehouses = false, true
		}
	}
	return r
}

func isEntityType(t Type) bool {
	switch t {
	case EntityCreated, EntityUpdated, EntityStatusChanged, EntityArchived, EntityRestored, EntityDeleted:
		return true
	}
	return false
}
