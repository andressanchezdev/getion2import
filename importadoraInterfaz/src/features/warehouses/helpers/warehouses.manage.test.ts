// warehouses.manage.test · pruebas del filtro de la tabla de bodegas y del código sugerido
// conecta con: warehouses.manage; se corre con npm test
import { describe, expect, it } from 'vitest'
import { filterWarehouses, suggestWarehouseCode } from './warehouses.manage'
import type { Warehouse } from '../types/warehouse.types'

const list: Warehouse[] = [
    { id: '1', name: 'Bodega Principal', code: 'B-01', city: 'Cali', managerName: 'Ana Ruiz', isActive: true },
    { id: '2', name: 'Bodega Norte', code: 'B-02', city: 'Bogotá', isActive: false },
]

describe('filterWarehouses', () => {
    it('busca por nombre, código, ciudad o administrador sin importar mayúsculas', () => {
        expect(filterWarehouses(list, 'norte', 'all').map((w) => w.id)).toEqual(['2'])
        expect(filterWarehouses(list, 'b-01', 'all').map((w) => w.id)).toEqual(['1'])
        expect(filterWarehouses(list, 'ana', 'all').map((w) => w.id)).toEqual(['1'])
    })

    it('filtra por estado', () => {
        expect(filterWarehouses(list, '', 'active').map((w) => w.id)).toEqual(['1'])
        expect(filterWarehouses(list, '', 'inactive').map((w) => w.id)).toEqual(['2'])
    })
})

describe('suggestWarehouseCode', () => {
    it('propone el siguiente al número más alto', () => {
        expect(suggestWarehouseCode(list)).toBe('B-03')
    })

    it('sin bodegas propone B-01 y ignora los códigos que no siguen el formato', () => {
        expect(suggestWarehouseCode([])).toBe('B-01')
        expect(suggestWarehouseCode([{ id: '1', name: 'X', code: 'PRINCIPAL' }])).toBe('B-01')
    })
})
