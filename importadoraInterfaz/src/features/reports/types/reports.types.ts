// reports.types · tipos de datos para reportes generales, ventas del día, traslados y rotación
export interface LowStockProduct {
  id: number
  code: string
  name: string
  available: number
  minStock: number
  category: string
}

export interface TodayTransfersSummary {
  totalCount: number
  inCount: number
  outCount: number
  pendingCount: number
}

export interface TopProduct {
  productId: number
  code: string
  name: string
  unitsSold: number
  totalAmount: number
}

export interface DeadStockProduct {
  productId: number
  code: string
  name: string
  stock: number
  lastCost: number
  daysWithoutSale: number
}

export interface GeneralDashboardReport {
  todaySalesCount: number
  todayRevenue: number
  todayCompleted: number
  todayCash?: number
  todayTransfer?: number
  todayCredit?: number
  todayPhysicalUnitsMoved?: number
  topSellingProducts: TopProduct[]
  todayTransfers: TodayTransfersSummary
  lowStockCount: number
  lowStockProducts: LowStockProduct[]
  highRotationProducts: TopProduct[]
  lowRotationProducts: DeadStockProduct[]
}
