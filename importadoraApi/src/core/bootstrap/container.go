package bootstrap

import (
	"importadoraApi/src/core/config"
	"importadoraApi/src/core/db"
	"importadoraApi/src/core/middlewares"

	authControllers "importadoraApi/src/features/auth/controllers"
	authRepos "importadoraApi/src/features/auth/repositories"
	authServices "importadoraApi/src/features/auth/services"

	healthControllers "importadoraApi/src/features/health/controllers"
	healthServices "importadoraApi/src/features/health/services"

	companyControllers "importadoraApi/src/features/companies/controllers"
	companyRepos "importadoraApi/src/features/companies/repositories"
	companyServices "importadoraApi/src/features/companies/services"

	warehouseControllers "importadoraApi/src/features/warehouses/controllers"
	warehouseRepos "importadoraApi/src/features/warehouses/repositories"
	warehouseServices "importadoraApi/src/features/warehouses/services"

	staffControllers "importadoraApi/src/features/staff/controllers"
	staffRepos "importadoraApi/src/features/staff/repositories"
	staffServices "importadoraApi/src/features/staff/services"

	customerControllers "importadoraApi/src/features/customers/controllers"
	customerRepos "importadoraApi/src/features/customers/repositories"
	customerServices "importadoraApi/src/features/customers/services"

	externalControllers "importadoraApi/src/features/externals/controllers"
	externalRepos "importadoraApi/src/features/externals/repositories"
	externalServices "importadoraApi/src/features/externals/services"

	catalogControllers "importadoraApi/src/features/catalog/controllers"
	catalogRepos "importadoraApi/src/features/catalog/repositories"
	catalogServices "importadoraApi/src/features/catalog/services"

	productControllers "importadoraApi/src/features/products/controllers"
	productRepos "importadoraApi/src/features/products/repositories"
	productServices "importadoraApi/src/features/products/services"

	inventoryControllers "importadoraApi/src/features/inventory/controllers"
	inventoryRepos "importadoraApi/src/features/inventory/repositories"
	inventoryServices "importadoraApi/src/features/inventory/services"

	cartControllers "importadoraApi/src/features/carts/controllers"
	cartRepos "importadoraApi/src/features/carts/repositories"
	cartServices "importadoraApi/src/features/carts/services"

	quotationControllers "importadoraApi/src/features/quotations/controllers"
	quotationRepos "importadoraApi/src/features/quotations/repositories"
	quotationServices "importadoraApi/src/features/quotations/services"

	saleControllers "importadoraApi/src/features/sales/controllers"
	saleRepos "importadoraApi/src/features/sales/repositories"
	saleServices "importadoraApi/src/features/sales/services"

	returnControllers "importadoraApi/src/features/returns/controllers"
	returnRepos "importadoraApi/src/features/returns/repositories"
	returnServices "importadoraApi/src/features/returns/services"

	paymentControllers "importadoraApi/src/features/payments/controllers"
	paymentRepos "importadoraApi/src/features/payments/repositories"
	paymentServices "importadoraApi/src/features/payments/services"

	walletControllers "importadoraApi/src/features/wallet/controllers"
	walletRepos "importadoraApi/src/features/wallet/repositories"
	walletServices "importadoraApi/src/features/wallet/services"

	purchaseControllers "importadoraApi/src/features/purchases/controllers"
	purchaseRepos "importadoraApi/src/features/purchases/repositories"
	purchaseServices "importadoraApi/src/features/purchases/services"

	notificationControllers "importadoraApi/src/features/notifications/controllers"
	notificationRepos "importadoraApi/src/features/notifications/repositories"
	notificationServices "importadoraApi/src/features/notifications/services"

	auditControllers "importadoraApi/src/features/audit/controllers"
	auditQueryRepos "importadoraApi/src/features/audit/repositories"
	auditServices "importadoraApi/src/features/audit/services"

	reportControllers "importadoraApi/src/features/reports/controllers"
	reportRepos "importadoraApi/src/features/reports/repositories"
	reportServices "importadoraApi/src/features/reports/services"

	recycleBinControllers "importadoraApi/src/features/recyclebin/controllers"
	recycleBinRepos "importadoraApi/src/features/recyclebin/repositories"
	recycleBinServices "importadoraApi/src/features/recyclebin/services"

	bankStatementControllers "importadoraApi/src/features/bank_statements/controllers"
	bankStatementRepos "importadoraApi/src/features/bank_statements/repositories"
	bankStatementServices "importadoraApi/src/features/bank_statements/services"
)

// AppContainer orquesta la inyección de dependencias de todos los módulos del sistema
type AppContainer struct {
	Cfg            *config.Config
	AuthMiddleware *middlewares.AuthMiddleware

	HealthCtrl        *healthControllers.HealthController
	AuthCtrl          *authControllers.AuthController
	CompanyCtrl       *companyControllers.CompanyController
	WarehouseCtrl     *warehouseControllers.WarehouseController
	StaffCtrl         *staffControllers.StaffController
	CustomerCtrl      *customerControllers.CustomerController
	ExternalCtrl      *externalControllers.ExternalController
	CatalogCtrl       *catalogControllers.CatalogController
	ProductCtrl       *productControllers.ProductController
	InventoryCtrl     *inventoryControllers.InventoryController
	CartCtrl          *cartControllers.CartController
	QuotationCtrl     *quotationControllers.QuotationController
	SaleCtrl          *saleControllers.SaleController
	ReturnCtrl        *returnControllers.ReturnController
	PaymentCtrl       *paymentControllers.PaymentController
	WalletCtrl        *walletControllers.WalletController
	PurchaseCtrl      *purchaseControllers.PurchaseController
	NotificationCtrl  *notificationControllers.NotificationController
	AuditCtrl         *auditControllers.AuditController
	ReportCtrl        *reportControllers.ReportController
	RecycleBinCtrl    *recycleBinControllers.RecycleBinController
	BankStatementCtrl *bankStatementControllers.BankStatementController
}

func NewContainer(cfg *config.Config, database *db.Database) *AppContainer {
	// Repositorios base
	authRepo := authRepos.NewAuthRepository()
	auditRepo := authRepos.NewAuditRepository()
	authMiddleware := middlewares.NewAuthMiddleware(cfg, database.Pool, authRepo)

	// Health & Auth
	healthService := healthServices.NewHealthService(cfg, database)
	healthCtrl := healthControllers.NewHealthController(healthService)

	authService := authServices.NewAuthService(cfg, database.Pool, authRepo, auditRepo)
	authCtrl := authControllers.NewAuthController(authService)

	// Companies & Warehouses
	companyRepo := companyRepos.NewCompanyRepository()
	companyService := companyServices.NewCompanyService(cfg, database.Pool, companyRepo, auditRepo)
	companyCtrl := companyControllers.NewCompanyController(companyService)

	warehouseRepo := warehouseRepos.NewWarehouseRepository()
	warehouseService := warehouseServices.NewWarehouseService(cfg, database.Pool, warehouseRepo, auditRepo)
	warehouseCtrl := warehouseControllers.NewWarehouseController(warehouseService)

	// Staff
	adminRepo := staffRepos.NewAdminRepository()
	roleRepo := staffRepos.NewRoleRepository()
	permissionRepo := staffRepos.NewPermissionRepository()
	employeeRepo := staffRepos.NewEmployeeRepository()
	staffService := staffServices.NewStaffService(cfg, database.Pool, adminRepo, roleRepo, permissionRepo, employeeRepo, auditRepo)
	staffCtrl := staffControllers.NewStaffController(staffService)

	// Customers & Externals
	customerRepo := customerRepos.NewCustomerRepository()
	customerService := customerServices.NewCustomerService(cfg, database.Pool, customerRepo, auditRepo)
	customerCtrl := customerControllers.NewCustomerController(customerService)

	externalRepo := externalRepos.NewExternalRepository()
	externalService := externalServices.NewExternalService(cfg, database.Pool, externalRepo, auditRepo)
	externalCtrl := externalControllers.NewExternalController(externalService)

	// Catalog & Products
	brandRepo := catalogRepos.NewBrandRepository()
	modelRepo := catalogRepos.NewModelRepository()
	categoryRepo := catalogRepos.NewCategoryRepository()
	catalogService := catalogServices.NewCatalogService(cfg, database.Pool, brandRepo, modelRepo, categoryRepo, auditRepo)
	catalogCtrl := catalogControllers.NewCatalogController(catalogService)

	productRepo := productRepos.NewProductRepository()
	productService := productServices.NewProductService(cfg, database.Pool, productRepo, categoryRepo, brandRepo, modelRepo, auditRepo)
	productCtrl := productControllers.NewProductController(productService)

	// Inventory
	inventoryRepo := inventoryRepos.NewInventoryRepository()
	inventoryService := inventoryServices.NewInventoryService(cfg, database.Pool, inventoryRepo, productRepo, warehouseRepo, auditRepo)
	inventoryCtrl := inventoryControllers.NewInventoryController(inventoryService)

	// Carts & Quotations
	cartRepo := cartRepos.NewCartRepository()
	cartService := cartServices.NewCartService(cfg, database.Pool, cartRepo, productRepo, inventoryRepo, customerRepo, auditRepo)
	cartCtrl := cartControllers.NewCartController(cartService)

	quotationRepo := quotationRepos.NewQuotationRepository()
	quotationService := quotationServices.NewQuotationService(cfg, database.Pool, quotationRepo, cartRepo, customerRepo, productRepo, auditRepo)
	quotationCtrl := quotationControllers.NewQuotationController(quotationService)

	// Sales & Returns
	saleRepo := saleRepos.NewSaleRepository()
	saleService := saleServices.NewSaleService(database.Pool, saleRepo, inventoryRepo)
	saleCtrl := saleControllers.NewSaleController(saleService)

	returnRepo := returnRepos.NewReturnRepository()
	returnService := returnServices.NewReturnService(database.Pool, returnRepo, saleRepo, inventoryRepo)
	returnCtrl := returnControllers.NewReturnController(returnService)

	// Payments, Wallet & Purchases
	paymentRepo := paymentRepos.NewPaymentRepository()
	paymentService := paymentServices.NewPaymentService(database.Pool, paymentRepo, saleRepo, auditRepo)
	paymentCtrl := paymentControllers.NewPaymentController(paymentService)

	walletRepo := walletRepos.NewWalletRepository()
	walletService := walletServices.NewWalletService(database.Pool, walletRepo, customerRepo, auditRepo)
	walletCtrl := walletControllers.NewWalletController(walletService)

	purchaseRepo := purchaseRepos.NewPurchaseRepository()
	purchaseService := purchaseServices.NewPurchaseService(database.Pool, purchaseRepo, externalRepo, warehouseRepo, inventoryRepo, auditRepo)
	purchaseCtrl := purchaseControllers.NewPurchaseController(purchaseService)

	notificationRepo := notificationRepos.NewNotificationRepository()
	notificationService := notificationServices.NewNotificationService(database.Pool, notificationRepo)
	notificationCtrl := notificationControllers.NewNotificationController(notificationService)

	auditQueryRepo := auditQueryRepos.NewAuditLogQueryRepository()
	auditService := auditServices.NewAuditService(database.Pool, auditQueryRepo)
	auditCtrl := auditControllers.NewAuditController(auditService)

	reportRepo := reportRepos.NewReportRepository()
	reportService := reportServices.NewReportService(database.Pool, reportRepo)
	reportCtrl := reportControllers.NewReportController(reportService)

	recycleBinRepo := recycleBinRepos.NewRecycleBinRepository()
	recycleBinService := recycleBinServices.NewRecycleBinService(database.Pool, recycleBinRepo, auditRepo)
	recycleBinCtrl := recycleBinControllers.NewRecycleBinController(recycleBinService)

	bankStatementRepo := bankStatementRepos.NewBankStatementRepository()
	bankStatementService := bankStatementServices.NewBankStatementService(database.Pool, bankStatementRepo, paymentRepo)
	bankStatementCtrl := bankStatementControllers.NewBankStatementController(bankStatementService)

	return &AppContainer{
		Cfg:               cfg,
		AuthMiddleware:    authMiddleware,
		HealthCtrl:        healthCtrl,
		AuthCtrl:          authCtrl,
		CompanyCtrl:       companyCtrl,
		WarehouseCtrl:     warehouseCtrl,
		StaffCtrl:         staffCtrl,
		CustomerCtrl:      customerCtrl,
		ExternalCtrl:      externalCtrl,
		CatalogCtrl:       catalogCtrl,
		ProductCtrl:       productCtrl,
		InventoryCtrl:     inventoryCtrl,
		CartCtrl:          cartCtrl,
		QuotationCtrl:     quotationCtrl,
		SaleCtrl:          saleCtrl,
		ReturnCtrl:        returnCtrl,
		PaymentCtrl:       paymentCtrl,
		WalletCtrl:        walletCtrl,
		PurchaseCtrl:      purchaseCtrl,
		NotificationCtrl:  notificationCtrl,
		AuditCtrl:         auditCtrl,
		ReportCtrl:        reportCtrl,
		RecycleBinCtrl:    recycleBinCtrl,
		BankStatementCtrl: bankStatementCtrl,
	}
}
