// inventory.api.types · lo que responde la API en Go en GET /stock (una fila por producto, bodega y ubicación) con los datos del producto, con los nombres del backend
// conecta con: inventory.adapter (convierte a InventoryStockRow) e inventory.service
export interface StockFullDto {
  stockId: number
  warehouseId: number
  warehouseName?: string
  productId: number
  productCode?: string
  productName?: string
  categoryName?: string | null
  brandName?: string | null
  location?: string | null
  available: number
  reserved: number
  sellable: number
  minStock?: number
}
