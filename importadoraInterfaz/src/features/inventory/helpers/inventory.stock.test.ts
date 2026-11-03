// inventory.stock.test · pruebas del filtro, los conteos por ubicación y los totales de la tabla de existencias
// conecta con: inventory.stock; se corre con npm test
import { describe, expect, it } from 'vitest'
import { availabilitySummary, distinctValues, filterStockRows, locationCountByProduct, productTotals, stockTotals } from './inventory.stock'
import type { InventoryStockRow } from '../types/inventory.types'

const row = (over: Partial<InventoryStockRow>): InventoryStockRow => ({
  id: 1,
  productId: 1,
  productCode: 'A',
  productName: 'A',
  category: 'Frenos',
  brand: 'Honda',
  location: 'E1',
  available: 10,
  reserved: 2,
  sellable: 8,
  minStock: 0,
  level: 'ok',
  ...over,
})

const rows = [
  row({ id: 1 }),
  row({ id: 2, location: 'E2', available: 5, reserved: 0, sellable: 5 }),
  row({ id: 3, productId: 2, category: 'Motor', brand: 'Yamaha', location: 'E1', available: 0, reserved: 0, sellable: 0 }),
]

describe('inventory.stock', () => {
  it('filtra por categoría y marca', () => {
    expect(filterStockRows(rows, { category: 'Motor', brand: '' }).map((r) => r.id)).toEqual([3])
    expect(filterStockRows(rows, { category: '', brand: 'Honda' }).map((r) => r.id)).toEqual([1, 2])
    expect(filterStockRows(rows, { category: '', brand: '' })).toHaveLength(3)
  })

  it('cuenta las ubicaciones con unidades de cada producto', () => {
    const counts = locationCountByProduct(rows)
    expect(counts.get(1)).toBe(2)
    expect(counts.get(2)).toBeUndefined()
  })

  it('suma por producto y en total', () => {
    expect(productTotals(rows).get(1)).toEqual({ available: 15, sellable: 13 })
    expect(stockTotals(rows)).toEqual({ available: 15, reserved: 2, sellable: 13 })
  })

  it('resume dónde hay existencias del producto, por bodega y ubicación', () => {
    const wh = [{ id: 1, name: 'Principal' }, { id: 2, name: 'Norte' }, { id: 3, name: 'Sur' }]
    const stock = [
      { warehouseId: 1, location: 'B1', available: 15 },
      { warehouseId: 1, location: 'B2', available: 3 },
      { warehouseId: 2, location: 'A1', available: 8 },
      { warehouseId: 3, location: 'C1', available: 0 },
    ]
    expect(availabilitySummary(stock, wh)).toBe('Disponible en Principal (B1: 15 und, B2: 3 und) y Norte (A1: 8 und)')
    expect(availabilitySummary([], wh)).toBe('')
  })

  it('lista los valores distintos ordenados', () => {
    expect(distinctValues(rows, 'brand')).toEqual(['Honda', 'Yamaha'])
  })
})
