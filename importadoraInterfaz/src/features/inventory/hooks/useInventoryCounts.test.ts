// useInventoryCounts.test · el avance de un conteo que llega por evento se aplica al detalle abierto por fila de stock
import { describe, expect, it } from 'vitest'
import type { InventoryCount } from '../types/inventory.counts.types'
import { applyCountProgress } from './useInventoryCounts'

const count: InventoryCount = {
  id: 5,
  companyId: 1,
  warehouseId: 7,
  warehouseName: 'Principal',
  status: 'pending',
  createdAt: '2026-11-12T10:00:00Z',
  items: [
    { id: 1, stockId: 100, productCode: 'A1', productName: 'Filtro', location: 'A-01', expectedQty: 10 },
    { id: 2, stockId: 101, productCode: 'B2', productName: 'Bujía', location: 'A-02', expectedQty: 4 },
  ],
}

describe('applyCountProgress', () => {
  it('actualiza solo los renglones contados, con su diferencia y quién contó', () => {
    const next = applyCountProgress(count, 5, [{ stockId: 100, countedQty: 8 }], 'Pedro')
    expect(next.items?.[0]).toMatchObject({ countedQty: 8, difference: -2, employeeName: 'Pedro' })
    expect(next.items?.[1]).toEqual(count.items?.[1])
  })
  it('un evento de otro conteo no cambia el detalle abierto', () => {
    expect(applyCountProgress(count, 99, [{ stockId: 100, countedQty: 8 }], 'Pedro')).toBe(count)
  })
})
