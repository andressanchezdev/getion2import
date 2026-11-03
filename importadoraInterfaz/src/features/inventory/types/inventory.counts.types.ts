// inventory.counts.types.ts · tipos para el módulo de conteos físicos de inventario
// conecta con: inventory.counts.service, useInventoryCounts y componentes de conteos físicos

export type CountStatus = 'pending' | 'verified' | 'corroborated'

export interface CountItem {
  id: number
  stockId: number
  productCode: string
  productName: string
  location: string
  expectedQty: number
  countedQty?: number | null
  difference?: number | null
  employeeId?: number | null
  employeeName?: string | null
}

export interface InventoryCount {
  id: number
  companyId: number
  warehouseId: number
  warehouseName: string
  employeeId?: number | null
  employeeName?: string | null
  status: CountStatus
  notes?: string | null
  createdAt: string
  closedAt?: string | null
  items?: CountItem[]
}

export interface CreateCountInput {
  warehouseId: number
  notes?: string
}

export interface UpdateCountItemInput {
  stockId: number
  countedQty: number
}

