// orders.adapter.test · pruebas de la conversión de pedidos del backend, el filtro de la tabla y las acciones por fila
// conecta con: orders.adapter y orders.actions; se corre con npm test
import { describe, expect, it } from 'vitest'
import { getOrderActions } from './orders.actions'
import { filterOrders, orderSerial, toOrderDetail, toOrderRow, toStageCounts } from './orders.adapter'

describe('orders.adapter', () => {
  it('arma la serie del pedido o usa «Venta id» si no hay consecutivo', () => {
    expect(orderSerial(40, 9)).toBe('PD-40')
    expect(orderSerial(undefined, 9)).toBe('Venta 9')
  })

  it('deja en 0 el conteo que falta', () => {
    const counts = toStageCounts({ Verification: 3, Picking: 1 })
    expect(counts.verification).toBe(3)
    expect(counts.dispatch).toBe(0)
  })

  it('convierte una fila de la tabla', () => {
    const row = toOrderRow(
      { saleId: 1, serialCode: 7, totalAmount: 5000, createdAt: '2026-10-27T10:00:00Z', isPause: 1, customerInformation: { name: 'Ana', lastName: 'Ruiz' } },
      'picking',
      'direct'
    )
    expect(row).toMatchObject({ serial: 'PD-7', customerName: 'Ana Ruiz', createdAt: '2026-10-27', paused: true, paymentVerified: false, sellerName: '—' })
  })

  it('ignora la fecha vacía del backend (0001-01-01)', () => {
    expect(toOrderRow({ saleId: 1, createdAt: '0001-01-01T00:00:00Z' }, 'picking', 'direct').createdAt).toBe('')
  })

  it('convierte el detalle con sus líneas y pagos', () => {
    const detail = toOrderDetail({
      sale: { saleId: 2, saleItems: [{ productId: 5, quantity: 2, price: 100, itemInformation: { description: 'ACTEVO' } }] },
      payments: [{ amount: 50, paymentMethod: 'cash' }],
    })
    expect(detail.lines[0]).toMatchObject({ title: 'ACTEVO', quantity: 2, price: 100 })
    expect(detail.payments[0]).toMatchObject({ amount: 50, method: 'cash' })
  })

  it('filtra la tabla sin importar tildes ni mayúsculas', () => {
    const rows = [
      toOrderRow({ saleId: 1, customerInformation: { name: 'José' } }, 'picking', 'direct'),
      toOrderRow({ saleId: 2, customerInformation: { name: 'Ana' } }, 'picking', 'direct'),
    ]
    expect(filterOrders(rows, 'JOSE')).toHaveLength(1)
    expect(filterOrders(rows, '')).toHaveLength(2)
  })
})

describe('getOrderActions', () => {
  const row = toOrderRow({ saleId: 1 }, 'picking', 'direct')

  it('ofrece anular solo con permiso', () => {
    expect(getOrderActions(row, false).map((a) => a.key)).toEqual(['detail', 'copy'])
    expect(getOrderActions(row, true).map((a) => a.key)).toEqual(['detail', 'copy', 'cancel'])
  })
})
