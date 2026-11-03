package dtos

// report_dto.go · formas de lo que entra y sale por la API en reportes (peticiones y respuestas)
// conecta con: los controllers y services de reportes

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

type LowStockProductDto struct {
	ID        int64  `json:"id"`
	Code      string `json:"code"`
	Name      string `json:"name"`
	Available int    `json:"available"`
	MinStock  int    `json:"minStock"`
	Category  string `json:"category"`
}

type TodayTransfersSummaryDto struct {
	TotalCount   int `json:"totalCount"`
	InCount      int `json:"inCount"`
	OutCount     int `json:"outCount"`
	PendingCount int `json:"pendingCount"`
}

type TopProductDto struct {
	ProductID   int64   `json:"productId"`
	Code        string  `json:"code"`
	Name        string  `json:"name"`
	UnitsSold   int     `json:"unitsSold"`
	TotalAmount float64 `json:"totalAmount"`
}

type DeadStockProductDto struct {
	ProductID       int64   `json:"productId"`
	Code            string  `json:"code"`
	Name            string  `json:"name"`
	Stock           int     `json:"stock"`
	LastCost        float64 `json:"lastCost"`
	DaysWithoutSale int     `json:"daysWithoutSale"`
}

type GeneralDashboardReport struct {
	TodaySalesCount         int                      `json:"todaySalesCount"`
	TodayRevenue            float64                  `json:"todayRevenue"`
	TodayCompleted          int                      `json:"todayCompleted"`
	TodayCash               float64                  `json:"todayCash"`
	TodayTransfer           float64                  `json:"todayTransfer"`
	TodayCredit             float64                  `json:"todayCredit"`
	TodayPhysicalUnitsMoved int                      `json:"todayPhysicalUnitsMoved"`
	TopSellingProducts      []TopProductDto          `json:"topSellingProducts"`
	TodayTransfers          TodayTransfersSummaryDto `json:"todayTransfers"`
	LowStockCount           int                      `json:"lowStockCount"`
	LowStockProducts        []LowStockProductDto     `json:"lowStockProducts"`
	HighRotationProducts    []TopProductDto          `json:"highRotationProducts"`
	LowRotationProducts     []DeadStockProductDto    `json:"lowRotationProducts"`
}
