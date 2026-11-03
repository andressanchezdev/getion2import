// warehouses.helpers.test · pruebas de la conversión de bodegas del backend y de la elección de la bodega activa
// conecta con: warehouses.helpers; se corre con npm test
import { describe, expect, it } from 'vitest'
import { pickActiveWarehouse, toWarehouses } from './warehouses.helpers'
import type { Warehouse } from '../types/warehouse.types'

describe('toWarehouses', () => {
  it('convierte el id a texto y conserva código y dirección', () => {
    expect(toWarehouses([{ id: 2, code: 'BOD2', name: ' Bodega Norte ', address: 'Calle 1', isActive: true }])).toEqual([
      {
        id: '2',
        name: 'Bodega Norte',
        code: 'BOD2',
        address: 'Calle 1',
        isActive: true,
        city: undefined,
        phone: undefined,
        description: undefined,
        managerEmployeeId: undefined,
        managerName: undefined,
        locationCount: 0,
        skuCount: 0,
      },
    ])
  })

  it('descarta las bodegas inactivas pero deja las que no traen el dato', () => {
    const result = toWarehouses([
      { id: 1, name: 'A', isActive: false },
      { id: 2, name: 'B' },
    ])
    expect(result.map((w) => w.id)).toEqual(['2'])
  })

  it('una dirección vacía queda sin dirección', () => {
    expect(toWarehouses([{ id: 1, name: 'A', address: '' }])[0].address).toBeUndefined()
  })
})

describe('pickActiveWarehouse', () => {
  const list: Warehouse[] = [
    { id: '1', name: 'Uno' },
    { id: '2', name: 'Dos', isDefault: true },
    { id: '3', name: 'Tres' },
  ]

  it('sin bodegas devuelve null', () => {
    expect(pickActiveWarehouse([], '1')).toBeNull()
  })

  it('conserva la activa si sigue existiendo cuando es admin', () => {
    expect(pickActiveWarehouse(list, '3', 1, true)?.id).toBe('3')
  })

  it('fuerza la bodega del empleado cuando no es admin', () => {
    expect(pickActiveWarehouse(list, '3', 1, false)?.id).toBe('1')
  })

  it('si la activa ya no existe usa la del usuario', () => {
    expect(pickActiveWarehouse(list, 'WH-01', 3)?.id).toBe('3')
  })

  it('si el usuario no tiene bodega usa la principal', () => {
    expect(pickActiveWarehouse(list, '', undefined)?.id).toBe('2')
  })

  it('si la del usuario no existe usa la principal', () => {
    expect(pickActiveWarehouse(list, '', 99)?.id).toBe('2')
  })

  it('sin principal usa la primera', () => {
    expect(pickActiveWarehouse([{ id: '5', name: 'Cinco' }, { id: '6', name: 'Seis' }], '')?.id).toBe('5')
  })
})
