// transfers.api.types · lo que responde el backend en traslados (nombres tal cual del Swagger: models.TrasladeResponse y models.SaleItemResponse)
// conecta con: transfers.adapter (los convierte a los tipos de la app) y transfers.service (los pide)
// ojo: las líneas llegan con productCode y productName; code, description y name quedan como respaldo de versiones anteriores

export interface TrasladeProductDto {
  productId?: number
  productCode?: string
  productName?: string
  quantity?: number
  price?: number
  discount?: number
  itemId?: number
  code?: string
  description?: string
  name?: string
}

export interface TrasladeWarehouseDto {
  warehouseId?: number
  name?: string
}

export interface TrasladeDto {
  saleId?: number
  id?: number
  serialCode?: number
  code?: number
  invoiceStatus?: string
  warehouseId?: number
  auxWarehouseId?: number
  warehouseInformation?: TrasladeWarehouseDto | null
  auxWarehouseInformation?: TrasladeWarehouseDto | null
  userInformation?: { name?: string; lastName?: string } | null
  products?: TrasladeProductDto[] | null
  created_at?: string
  createdAt?: string
  reason?: string
}

// respuesta de POST /sales/register al crear un traslado; el Swagger no documenta su cuerpo
export interface TrasladeCreatedDto {
  saleId?: number
  id?: number
  serialCode?: number | string
}
