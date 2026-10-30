package bootstrap

import (
	"github.com/labstack/echo/v4"

	authRoutes "importadoraApi/src/features/auth/routes"
	auditRoutes "importadoraApi/src/features/audit/routes"
	cartRoutes "importadoraApi/src/features/carts/routes"
	catalogRoutes "importadoraApi/src/features/catalog/routes"
	companyRoutes "importadoraApi/src/features/companies/routes"
	customerRoutes "importadoraApi/src/features/customers/routes"
	externalRoutes "importadoraApi/src/features/externals/routes"
	healthRoutes "importadoraApi/src/features/health/routes"
	inventoryRoutes "importadoraApi/src/features/inventory/routes"
	notificationRoutes "importadoraApi/src/features/notifications/routes"
	paymentRoutes "importadoraApi/src/features/payments/routes"
	productRoutes "importadoraApi/src/features/products/routes"
	purchaseRoutes "importadoraApi/src/features/purchases/routes"
	quotationRoutes "importadoraApi/src/features/quotations/routes"
	recycleBinRoutes "importadoraApi/src/features/recyclebin/routes"
	reportRoutes "importadoraApi/src/features/reports/routes"
	returnRoutes "importadoraApi/src/features/returns/routes"
	saleRoutes "importadoraApi/src/features/sales/routes"
	staffRoutes "importadoraApi/src/features/staff/routes"
	walletRoutes "importadoraApi/src/features/wallet/routes"
	warehouseRoutes "importadoraApi/src/features/warehouses/routes"
	bankStatementRoutes "importadoraApi/src/features/bank_statements/routes"
)

// RegisterAllRoutes conecta los controladores de cada módulo con Echo
func RegisterAllRoutes(e *echo.Echo, c *AppContainer) {
	healthRoutes.RegisterRoutes(e, c.HealthCtrl)
	authRoutes.RegisterRoutes(e, c.AuthMiddleware, c.AuthCtrl)
	companyRoutes.RegisterRoutes(e, c.AuthMiddleware, c.CompanyCtrl)
	warehouseRoutes.RegisterRoutes(e, c.AuthMiddleware, c.WarehouseCtrl)
	staffRoutes.RegisterRoutes(e, c.AuthMiddleware, c.StaffCtrl)
	customerRoutes.RegisterRoutes(e, c.AuthMiddleware, c.CustomerCtrl)
	externalRoutes.RegisterRoutes(e, c.AuthMiddleware, c.ExternalCtrl)
	catalogRoutes.RegisterRoutes(e, c.AuthMiddleware, c.CatalogCtrl)
	productRoutes.RegisterRoutes(e, c.AuthMiddleware, c.ProductCtrl)
	inventoryRoutes.RegisterRoutes(e, c.AuthMiddleware, c.InventoryCtrl)
	cartRoutes.RegisterRoutes(e, c.AuthMiddleware, c.CartCtrl)
	quotationRoutes.RegisterRoutes(e, c.AuthMiddleware, c.QuotationCtrl)
	saleRoutes.RegisterRoutes(e, c.AuthMiddleware, c.SaleCtrl)
	returnRoutes.RegisterRoutes(e, c.AuthMiddleware, c.ReturnCtrl)
	paymentRoutes.RegisterRoutes(e, c.AuthMiddleware, c.PaymentCtrl)
	walletRoutes.RegisterRoutes(e, c.AuthMiddleware, c.WalletCtrl)
	purchaseRoutes.RegisterRoutes(e, c.AuthMiddleware, c.PurchaseCtrl)
	notificationRoutes.RegisterRoutes(e, c.AuthMiddleware, c.NotificationCtrl)
	auditRoutes.RegisterRoutes(e, c.AuthMiddleware, c.AuditCtrl)
	reportRoutes.RegisterRoutes(e, c.AuthMiddleware, c.ReportCtrl)
	recycleBinRoutes.RegisterRoutes(e, c.AuthMiddleware, c.RecycleBinCtrl)
	bankStatementRoutes.RegisterRoutes(e, c.AuthMiddleware, c.BankStatementCtrl)
}

