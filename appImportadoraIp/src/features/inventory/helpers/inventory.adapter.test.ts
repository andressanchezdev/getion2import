// inventory.adapter.test · pruebas de la conversión de productos del control de inventario (forma real de /inventory/filter)
// conecta con: inventory.adapter; se corre con npm test
import { describe, expect, it } from 'vitest'
import { toStockItem } from './inventory.adapter'

const dto = {
  productId: 13482,
  code: '17020420',
  productInformation: { brandName: 'IMPORTADO', categoryName: 'SEGURO DIRECCION', description: '', modelName: 'AKT 125 NKD', isActive: true },
  locations: [
    { locationCode: 'ZR', warehouseId: 5, productLocationId: 1, physicalStock: 10, stockMax: 100 },
    { locationCode: '04-F01', warehouseId: 1, productLocationId: 2, physicalStock: 4, stockMax: 20 },
  ],
  inventory: { physicalTotal: 14, reservedTotal: 3, availableInStore: 11 },
  stock: { minStock: 0, maxStock: 0 },
  statusFlags: { isActive: true },
}

describe('toStockItem', () => {
  it('arma nombre, marca, existencias y reservado', () => {
    expect(toStockItem(dto)).toMatchObject({
      id: 13482,
      code: '17020420',
      brand: 'IMPORTADO',
      model: 'AKT 125 NKD',
      physicalTotal: 14,
      reserved: 3,
      available: 11,
      isActive: true,
    })
  })

  it('con descripción vacía el nombre sale de categoría y modelo', () => {
    expect(toStockItem(dto).name).toBe('SEGURO DIRECCION AKT 125 NKD')
    expect(toStockItem({ productId: 1, code: 'X' }).name).toBe('X')
    expect(toStockItem({ productId: 2 }).name).toBe('Producto 2')
  })

  it('con bodega solo cuenta las ubicaciones de esa bodega', () => {
    const item = toStockItem(dto, 1)
    expect(item.locations).toEqual([{ code: '04-F01', stock: 4 }])
    expect(item.warehouseStock).toBe(4)
    expect(item.physicalTotal).toBe(14) // el total físico sigue siendo el de todas las bodegas
  })

  it('sin bodega muestra todas las ubicaciones', () => {
    expect(toStockItem(dto).warehouseStock).toBe(14)
  })

  it('poco stock solo si hay mínimo definido y la existencia lo alcanzó', () => {
    expect(toStockItem(dto).lowStock).toBe(false) // mínimo 0 = sin mínimo
    expect(toStockItem({ ...dto, stock: { minStock: 14 } }).lowStock).toBe(true)
    expect(toStockItem({ ...dto, stock: { minStock: 5 } }).lowStock).toBe(false)
  })

  it('campos que faltan quedan en 0 y una ubicación sin código se nombra', () => {
    const item = toStockItem({ productId: 3, locations: [{ warehouseId: 1, physicalStock: 2 }] })
    expect(item).toMatchObject({ physicalTotal: 0, reserved: 0, available: 0, minStock: 0 })
    expect(item.locations[0].code).toBe('Sin ubicación')
  })
})
