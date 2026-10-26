// transfers.adapter.test · pruebas de la conversión de traslados del backend (líneas con productCode y productName)
// conecta con: transfers.adapter; se corre con npm test
import { describe, expect, it } from 'vitest'
import { toTrasladeItems } from './transfers.adapter'

describe('toTrasladeItems', () => {
  it('lee las líneas con los nombres reales del backend (productCode, productName)', () => {
    const [item] = toTrasladeItems([
      {
        saleId: 7,
        serialCode: 555,
        invoiceStatus: 'verification',
        warehouseInformation: { warehouseId: 1, name: 'Principal' },
        auxWarehouseInformation: { warehouseId: 4, name: 'Sur' },
        products: [{ productId: 9, productCode: 'A-1', productName: 'Filtro de aceite', quantity: 3 }],
      },
    ])
    expect(item.products[0]).toEqual({ productId: 9, code: 'A-1', description: 'Filtro de aceite', quantity: 3 })
    expect(item).toMatchObject({ saleId: 7, serialCode: 555, originWarehouse: { id: 1, name: 'Principal' }, destWarehouse: { id: 4, name: 'Sur' } })
  })

  it('sigue aceptando los nombres anteriores como respaldo', () => {
    const [item] = toTrasladeItems([{ saleId: 8, products: [{ productId: 1, code: 'B', description: 'Bujía', quantity: 1 }] }])
    expect(item.products[0]).toMatchObject({ code: 'B', description: 'Bujía' })
  })
})
