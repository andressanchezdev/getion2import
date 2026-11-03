import { describe, expect, it } from 'vitest'
import { addLine, clampQuantity, groupByOrigin, removeLine, setLineQuantity, totalUnits, validateRequest } from './transfers.request'
import type { TransferRequestLine } from '../types/transfers.types'

const line = (productId: number, originWarehouseId: number, quantity = 1, max = 5): TransferRequestLine => ({
  productId,
  code: `P${productId}`,
  description: `Producto ${productId}`,
  originWarehouseId,
  originWarehouseName: `Bodega ${originWarehouseId}`,
  quantity,
  max,
})

describe('transfers.request', () => {
  it('la cantidad queda entre 1 y lo disponible', () => {
    expect(clampQuantity(0, 5)).toBe(1)
    expect(clampQuantity(9, 5)).toBe(5)
    expect(clampQuantity(3.7, 5)).toBe(3)
    expect(clampQuantity(Number.NaN, 5)).toBe(1)
  })

  it('agregar el mismo producto de la misma bodega suma sin pasarse del máximo', () => {
    const lines = addLine(addLine([], line(1, 10, 2)), line(1, 10, 9))
    expect(lines).toHaveLength(1)
    expect(lines[0].quantity).toBe(5)
  })

  it('el mismo producto de otra bodega es otra línea', () => {
    expect(addLine([line(1, 10)], line(1, 20))).toHaveLength(2)
  })

  it('cambiar y quitar afectan solo la línea indicada', () => {
    const lines = [line(1, 10), line(1, 20), line(2, 10)]
    expect(setLineQuantity(lines, { productId: 1, originWarehouseId: 20 }, 4).map((l) => l.quantity)).toEqual([1, 4, 1])
    expect(removeLine(lines, { productId: 1, originWarehouseId: 10 }).map((l) => `${l.productId}-${l.originWarehouseId}`)).toEqual(['1-20', '2-10'])
  })

  it('agrupa por bodega de origen: dos de una bodega y dos de otra son dos traslados', () => {
    const groups = groupByOrigin([line(1, 10), line(2, 20), line(3, 10), line(4, 20)])
    expect(groups.map((g) => [g.originWarehouseId, g.lines.map((l) => l.productId)])).toEqual([
      [10, [1, 3]],
      [20, [2, 4]],
    ])
    expect(totalUnits([line(1, 10, 2), line(2, 20, 3)])).toBe(5)
  })

  it('valida destino, líneas vacías, auto-pedido y cantidades', () => {
    expect(validateRequest([line(1, 10)], 0)).toMatch(/Elige la bodega/)
    expect(validateRequest([], 5)).toMatch(/al menos un repuesto/)
    expect(validateRequest([line(1, 5)], 5)).toMatch(/a sí misma/)
    expect(validateRequest([line(1, 10, 9, 5)], 5)).toMatch(/entre 1 y 5/)
    expect(validateRequest([line(1, 10), line(2, 20)], 5)).toBeNull()
  })
})
