// inventory.adapter.test · pruebas de las filas de stock de la tabla: conversión y nivel (agotado, bajo o disponible)
// conecta con: inventory.adapter; se corre con npm test
import { describe, expect, it } from 'vitest'
import { stockLevelOf, toInventoryStockRow } from './inventory.adapter'

describe('stockLevelOf', () => {
  it('sin vendible está agotado, hasta la alerta mínima está bajo y por encima está bien', () => {
    expect(stockLevelOf(0, 3)).toBe('out')
    expect(stockLevelOf(-2, 3)).toBe('out')
    expect(stockLevelOf(3, 3)).toBe('low')
    expect(stockLevelOf(4, 3)).toBe('ok')
  })

  it('sin alerta propia se usa 5', () => {
    expect(stockLevelOf(5, 0)).toBe('low')
    expect(stockLevelOf(6, 0)).toBe('ok')
  })
})

describe('toInventoryStockRow', () => {
  it('convierte la fila y calcula el nivel con lo vendible', () => {
    const row = toInventoryStockRow({ stockId: 9, warehouseId: 1, productId: 5, productCode: '36DD4001-1', productName: 'ANILLOS BOXER CT', categoryName: 'REPUESTOS Y MOTOR', brandName: 'BAJAJ', location: 'ESTANTE-P1-01', available: 45, reserved: 43, sellable: 2, minStock: 3 })
    expect(row).toMatchObject({ id: 9, productCode: '36DD4001-1', productName: 'ANILLOS BOXER CT', brand: 'BAJAJ', location: 'ESTANTE-P1-01', available: 45, reserved: 43, sellable: 2, minStock: 3, level: 'low' })
  })

  it('con datos faltantes usa valores vacíos y el código como nombre', () => {
    const row = toInventoryStockRow({ stockId: 1, warehouseId: 1, productId: 8, productCode: 'X1', available: 0, reserved: 0, sellable: 0 })
    expect(row).toMatchObject({ productName: 'X1', category: '', brand: '', location: '', minStock: 0, level: 'out' })
  })
})
