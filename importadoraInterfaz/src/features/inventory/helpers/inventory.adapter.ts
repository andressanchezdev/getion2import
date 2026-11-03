// inventory.adapter · convierte las filas de stock de la API a las de la tabla y decide si están agotadas, bajas o bien; el único lugar que conoce los nombres del backend en esta feature
// conecta con: inventory.service (convierte), inventory.api.types e inventory.types
import type { StockFullDto } from '../types/inventory.api.types'
import type { InventoryStockRow, StockLevel } from '../types/inventory.types'

// sin vendible está agotado; con vendible igual o menor a la alerta mínima (5 si la fila no la trae) está bajo
export const stockLevelOf = (sellable: number, minStock: number): StockLevel => (sellable <= 0 ? 'out' : sellable <= (minStock > 0 ? minStock : 5) ? 'low' : 'ok')

// convierte una fila de existencias de la API en la de la tabla, con su nivel (agotado, bajo o disponible)
export const toInventoryStockRow = (dto: StockFullDto): InventoryStockRow => {
  const minStock = dto.minStock ?? 0
  return {
    id: dto.stockId,
    productId: dto.productId,
    productCode: dto.productCode ?? '',
    productName: dto.productName ?? dto.productCode ?? `Producto ${dto.productId}`,
    category: dto.categoryName ?? '',
    brand: dto.brandName ?? '',
    location: dto.location ?? '',
    available: dto.available,
    reserved: dto.reserved,
    sellable: Math.max(0, dto.sellable),
    minStock,
    level: stockLevelOf(dto.sellable, minStock),
  }
}
