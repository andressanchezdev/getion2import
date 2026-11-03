import { describe, expect, it } from 'vitest'
import { filterLocations, hasStock, locationLabel, locationQrValue, parseQrValue, productLabel, productQrValue, toContentItem, toLocation } from './locations.adapter'
import type { WarehouseLocation } from '../types/locations.types'

const location = (over: Partial<WarehouseLocation> = {}): WarehouseLocation => ({ id: 1, warehouseId: 2, code: 'ESTANTE-A', description: 'Pasillo 1', isActive: true, productCount: 3, units: 40, ...over })

describe('locations.adapter', () => {
  it('convierte una ubicación de la API y rellena lo que no viene', () => {
    expect(toLocation({ id: 5, warehouseId: 2, code: 'X1', isActive: true })).toEqual({ id: 5, warehouseId: 2, code: 'X1', description: '', isActive: true, productCount: 0, units: 0 })
    expect(toLocation({ id: 5, warehouseId: 2, code: 'X1', description: ' Pasillo ', isActive: false, productCount: 2, units: 9 })).toMatchObject({ description: 'Pasillo', isActive: false, productCount: 2, units: 9 })
  })

  it('convierte una fila de stock en un producto de la ubicación', () => {
    expect(toContentItem({ stockId: 1, productId: 7, productCode: 'REP-1', productName: 'Pastillas', available: 10, reserved: 2, sellable: 8 })).toMatchObject({ productCode: 'REP-1', brandName: '', sellable: 8 })
  })

  it('filtra por código o descripción sin importar mayúsculas', () => {
    const list = [location(), location({ id: 2, code: 'PASILLO-B', description: 'Frenos' })]
    expect(filterLocations(list, 'estante')).toHaveLength(1)
    expect(filterLocations(list, 'FRENOS')[0].code).toBe('PASILLO-B')
    expect(filterLocations(list, '  ')).toHaveLength(2)
  })

  it('el texto del QR de una ubicación y de un producto se puede leer de vuelta', () => {
    expect(parseQrValue(locationQrValue(2, 'ESTANTE-A'))).toEqual({ kind: 'location', warehouseId: 2, code: 'ESTANTE-A' })
    expect(parseQrValue(productQrValue(2, 'ESTANTE-A', 'REP-1'))).toEqual({ kind: 'product', warehouseId: 2, locationCode: 'ESTANTE-A', productCode: 'REP-1' })
  })

  it('un QR que no es de este sistema no se interpreta', () => {
    expect(parseQrValue('https://ejemplo.com')).toBeNull()
    expect(parseQrValue('IP|L|0|A')).toBeNull()
    expect(parseQrValue('IP|X|2|A')).toBeNull()
    expect(parseQrValue('IP|P|2|A')).toBeNull()
  })

  it('las etiquetas llevan el QR, el código y dónde está', () => {
    expect(locationLabel(location(), 'Principal')).toEqual({ value: 'IP|L|2|ESTANTE-A', title: 'ESTANTE-A', subtitle: 'Pasillo 1', caption: 'Principal' })
    expect(productLabel(2, 'ESTANTE-A', 'REP-1', 'Pastillas', 'Principal')).toEqual({ value: 'IP|P|2|ESTANTE-A|REP-1', title: 'REP-1', subtitle: 'Pastillas', caption: 'Principal · ESTANTE-A' })
  })

  it('hasStock avisa solo si la ubicación guarda productos o unidades', () => {
    expect(hasStock(location())).toBe(true)
    expect(hasStock(location({ productCount: 0, units: 0 }))).toBe(false)
  })
})
