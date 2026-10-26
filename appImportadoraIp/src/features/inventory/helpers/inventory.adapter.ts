// inventory.adapter · convierte los productos de control de inventario del backend a lo que usa la app
// conecta con: inventory.service (lo aplica a cada respuesta); es el único lugar que conoce los nombres del backend en control de inventario
// ojo: SUPUESTO a confirmar con datos reales: inventory.* (físico total, reservado, disponible) suma todas las bodegas del producto; por eso la existencia de la bodega activa se calcula aparte desde locations[].physicalStock
import type { ControlItemDto } from '../types/inventory.api.types'
import type { StockItem } from '../types/inventory.types'

const num = (value: number | undefined | null): number => (Number.isFinite(value) ? (value as number) : 0)
const text = (value: string | undefined | null): string => (value ?? '').trim()

// warehouseId opcional: con bodega solo se muestran sus ubicaciones
export const toStockItem = (dto: ControlItemDto, warehouseId?: number): StockItem => {
  const info = dto.productInformation
  const locations = (dto.locations ?? [])
    .filter((row) => warehouseId === undefined || row.warehouseId === warehouseId)
    .map((row) => ({ code: text(row.locationCode) || 'Sin ubicación', stock: num(row.physicalStock) }))
  const inventory = dto.inventory
  const physicalTotal = num(inventory?.physicalTotal)
  const minStock = num(dto.stock?.minStock)
  const category = text(info?.categoryName)
  const model = text(info?.modelName)
  const code = text(dto.code)
  return {
    id: dto.productId,
    code,
    name: text(info?.description) || [category, model].filter(Boolean).join(' ') || code || `Producto ${dto.productId}`,
    brand: text(info?.brandName),
    category,
    model,
    isActive: dto.statusFlags?.isActive ?? info?.isActive ?? true,
    locations,
    warehouseStock: locations.reduce((sum, row) => sum + row.stock, 0),
    physicalTotal,
    reserved: num(inventory?.reservedTotal),
    available: num(inventory?.availableInStore),
    minStock,
    lowStock: minStock > 0 && physicalTotal <= minStock,
  }
}
