// inventory.stock · funciones puras de la tabla de existencias: filtrar por categoría y marca, contar en cuántas ubicaciones está cada producto y sumar totales
// conecta con: useStockTable (filtra y suma) y StockTable (el distintivo «Presente en N ubicaciones»); no toca el store
import type { InventoryStockRow } from '../types/inventory.types'

export interface StockFilters {
  category: string
  brand: string
}

export const EMPTY_STOCK_FILTERS: StockFilters = { category: '', brand: '' }

// deja solo las filas de la categoría y la marca elegidas (vacío = todas)
export const filterStockRows = (rows: InventoryStockRow[], filters: StockFilters): InventoryStockRow[] =>
  rows.filter((row) => (!filters.category || row.category === filters.category) && (!filters.brand || row.brand === filters.brand))

// en cuántas ubicaciones con unidades aparece cada producto entre las filas dadas
export const locationCountByProduct = (rows: InventoryStockRow[]): Map<number, number> => {
  const counts = new Map<number, number>()
  for (const row of rows) if (row.available > 0 && row.location) counts.set(row.productId, (counts.get(row.productId) ?? 0) + 1)
  return counts
}

// total de cada producto sumando todas sus ubicaciones (físico y vendible)
export const productTotals = (rows: InventoryStockRow[]): Map<number, { available: number; sellable: number }> => {
  const totals = new Map<number, { available: number; sellable: number }>()
  for (const row of rows) {
    const current = totals.get(row.productId) ?? { available: 0, sellable: 0 }
    totals.set(row.productId, { available: current.available + row.available, sellable: current.sellable + row.sellable })
  }
  return totals
}

// total de las filas dadas
export const stockTotals = (rows: InventoryStockRow[]) =>
  rows.reduce((sum, row) => ({ available: sum.available + row.available, reserved: sum.reserved + row.reserved, sellable: sum.sellable + row.sellable }), { available: 0, reserved: 0, sellable: 0 })

// opciones distintas (ordenadas) de un campo de las filas, para llenar los filtros
export const distinctValues = (rows: InventoryStockRow[], field: 'category' | 'brand'): string[] => [...new Set(rows.map((row) => row[field]).filter(Boolean))].sort((a, b) => a.localeCompare(b))

// frase de dónde hay existencias de un producto: «Principal (B1: 15 und, B2: 3 und) y Norte (A1: 8 und)»; vacío si no hay en ninguna bodega
export const availabilitySummary = (rows: Array<{ warehouseId: number; location?: string | null; available: number }>, warehouses: Array<{ id: string | number; name: string }>): string => {
  const parts = warehouses
    .map((warehouse) => {
      const places = rows.filter((row) => String(row.warehouseId) === String(warehouse.id) && row.available > 0).map((row) => `${row.location || 'sin estante'}: ${row.available} und`)
      return places.length > 0 ? `${warehouse.name} (${places.join(', ')})` : ''
    })
    .filter(Boolean)
  if (parts.length === 0) return ''
  return `Disponible en ${parts.length > 1 ? `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}` : parts[0]}`
}
