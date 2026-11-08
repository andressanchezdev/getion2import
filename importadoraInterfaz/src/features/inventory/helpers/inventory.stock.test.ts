// inventory.stock.test · pruebas del filtro, los conteos por ubicación y los totales de la tabla de existencias
// conecta con: inventory.stock; se corre con npm test
import { describe, expect, it } from 'vitest'
import { distinctValues, filterStockRows, locationCountByProduct, productTotals, stockTotals } from './inventory.stock'
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

  it('lista los valores distintos ordenados', () => {
    expect(distinctValues(rows, 'brand')).toEqual(['Honda', 'Yamaha'])
  })
})
