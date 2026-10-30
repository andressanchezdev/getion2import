package dtos

type SalesDashboardReport struct {
	TotalSalesCount int     `json:"totalSalesCount"`
	TotalRevenue    float64 `json:"totalRevenue"`
	AverageTicket   float64 `json:"averageTicket"`
	TotalPaid       float64 `json:"totalPaid"`
	TotalPending    float64 `json:"totalPending"`
	CompletedSales  int     `json:"completedSales"`
	OpenSales       int     `json:"openSales"`
	CancelledSales  int     `json:"cancelledSales"`
}

type InventoryDashboardReport struct {
	TotalSKUs           int     `json:"totalSkus"`
	TotalPhysicalUnits  int     `json:"totalPhysicalUnits"`
	TotalAvailableUnits int     `json:"totalAvailableUnits"`
	TotalReservedUnits  int     `json:"totalReservedUnits"`
	TotalValuationCost  float64 `json:"totalValuationCost"`
}

type WalletDashboardReport struct {
	TotalCustomersWithCredit int     `json:"totalCustomersWithCredit"`
	TotalOutstandingDebt     float64 `json:"totalOutstandingDebt"` // Cartera por cobrar (< 0)
	TotalStoreCreditBalance  float64 `json:"totalStoreCreditBalance"` // Saldos a favor de clientes (> 0)
}

