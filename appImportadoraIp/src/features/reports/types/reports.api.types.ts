// reports.api.types · lo que responde el backend en reportes (nombres tal cual del Swagger) y lo que se envía
// conecta con: reports.adapter (los convierte a tarjetas) y reports.service (los pide)
// ojo: con los datos de prueba los desgloses (salesByDay, topProducts, salesByChannel, revenueByMonth, topCustomers, stockByBrand...) llegan SIEMPRE null: solo los totales sirven, por eso la app no los pinta

// POST /sales/summary (models.SalesSummaryResponse)
export interface SalesSummaryDto {
  totalSales?: number
  totalCompletedSales?: number
  totalPendingSales?: number
  totalCancelledSales?: number
  totalRevenue?: number
  totalRevenueCompleted?: number
  averageOrderValue?: number
}

// POST /reports/financial (models.FinancialReportResponse)
export interface FinancialReportDto {
  totalRevenue?: number
  totalCost?: number
  grossProfit?: number
  grossMargin?: number
  totalDiscounts?: number
  totalTaxes?: number
  netRevenue?: number
  accountsReceivable?: number
  generatedAt?: string
}

// POST /reports/customers (models.CustomerReportResponse)
export interface CustomerReportDto {
  totalCustomers?: number
  activeCustomers?: number
  newCustomers?: number
  totalRevenue?: number
  averageOrderValue?: number
  customersByType?: Array<{ customerType?: string; customerCount?: number; totalRevenue?: number; percentage?: number }> | null
  generatedAt?: string
}

// POST /reports/inventory (models.InventoryReportResponse)
export interface InventoryReportDto {
  totalProducts?: number
  totalStock?: number
  totalValue?: number
  lowStockCount?: number
  outOfStockCount?: number
  generatedAt?: string
}
