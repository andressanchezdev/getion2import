// inventory.api.types · lo que responde el backend en el control de inventario (POST /inventory/filter y POST /inventory/search: misma forma de 54 campos)
// conecta con: inventory.adapter (los convierte a los tipos de la app) y inventory.service (los pide)
// ojo: inventory.physicalByLocation tiene llaves dinámicas (el código de cada ubicación: ZR, 04-F01...), por eso es un Record; los totales de inventory son de TODAS las bodegas del producto

export interface ControlLocationDto {
  locationCode?: string
  warehouseId: number
  productLocationId?: number
  physicalStock?: number
  stockMax?: number
}

export interface ControlInventoryDto {
  physicalByLocation?: Record<string, number> | null
  physicalTotal?: number
  inCart?: number
  verification?: number
  picking?: number
  picked?: number
  invoicingPending?: number
  reservedTotal?: number
  availableInStore?: number
  systemTotal?: number
  maxCapacity?: number
}

export interface ControlItemDto {
  productId: number
  code?: string
  productInformation?: {
    brandName?: string
    categoryName?: string
    description?: string
    modelName?: string
    productImage?: string
    isActive?: boolean
    isNew?: boolean
    isPending?: boolean
  } | null
  locations?: ControlLocationDto[] | null
  inventory?: ControlInventoryDto | null
  stock?: { minStock?: number; maxStock?: number } | null
  statusFlags?: { isActive?: boolean; isPromotion?: boolean; hasImages?: boolean } | null
}

// cuerpo de POST /inventory/filter: solo lleva los filtros aplicados
export interface InventoryFilterBody {
  companyId: number
  page: number
  pageSize: number
  warehouseId?: number
  hasStock?: boolean
}
