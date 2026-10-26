// management.adapter.test · pruebas de la conversión de POST /management (forma real observada) a etapas, canales y contadores
// conecta con: management.adapter; se corre con npm test
import { describe, expect, it } from 'vitest'
import { toOrder, toPipeline } from './management.adapter'

// respuesta real de state "dispatch" en la empresa de prueba
const REAL = {
  Verification: 13, Picking: 1, Packing: 0, Invoicing: 41, Dispatch: 17657, Sent: 198, withoutTaking: 0,
  ordersMajority: 0, ordersImmediate: 17655, ordersCorporate: 2, ordersMinority: 0, ordersTrasladeWithoutTaking: 0,
  ordersFinalAssignment: 10878, ordersFinalFinished: 0, ordersDirect: 0, ordersDirectDisptach: 2,
}

describe('toPipeline', () => {
  it('arma las seis etapas en orden con su nombre', () => {
    const { stages } = toPipeline(REAL)
    expect(stages.map((s) => [s.key, s.count])).toEqual([['verification', 13], ['picking', 1], ['packing', 0], ['invoicing', 41], ['dispatch', 17657], ['sent', 198]])
    expect(stages[0].label).toBe('Verificación')
  })

  it('arma el desglose por canal de la etapa pedida', () => {
    const { channels } = toPipeline(REAL)
    expect(channels.find((c) => c.key === 'immediate')?.count).toBe(17655)
    expect(channels.find((c) => c.key === 'corporate')?.count).toBe(2)
  })

  it('lee los contadores aparte, incluido el que el backend escribe con error (ordersDirectDisptach)', () => {
    const { extras } = toPipeline(REAL)
    expect(extras.find((e) => e.key === 'finalAssignment')?.count).toBe(10878)
    expect(extras.find((e) => e.key === 'directDispatch')?.count).toBe(2)
  })

  it('un contador que falta o no es número queda en 0', () => {
    const data = toPipeline({ Verification: 5, Picking: Number.NaN } as never)
    expect(data.stages[0].count).toBe(5)
    expect(data.stages[1].count).toBe(0)
    expect(data.channels.every((c) => c.count === 0)).toBe(true)
  })
})

// pedido real de /management/saleOrders (etapa verification, canal corporate)
const ORDER = {
  saleId: 91453, serialCode: 1, paymentMethod: 'cash', totalAmount: 26000, createdAt: '2025-10-07T20:07:00Z', isPause: 0, verifiedTransaction: 1, verifiedLocation: 0,
  customerInformation: { name: 'Taller Norte', lastName: '' }, sellerInformation: { name: 'Test', lastName: 'Updated' },
}

describe('toOrder', () => {
  it('arma número, cliente, vendedor, total, fecha y controles', () => {
    expect(toOrder(ORDER)).toEqual({
      id: 91453, serialCode: 1, customerName: 'Taller Norte', sellerName: 'Test Updated', paymentMethod: 'cash', totalAmount: 26000, createdAt: '2025-10-07', paused: false, transactionVerified: true, locationVerified: false,
    })
  })

  it('un pedido pausado se marca; los controles son 0 o 1', () => {
    expect(toOrder({ ...ORDER, isPause: 1, verifiedTransaction: 0, verifiedLocation: 1 })).toMatchObject({ paused: true, transactionVerified: false, locationVerified: true })
  })

  it('sin datos usa valores neutros y la fecha 0001-01-01 queda vacía', () => {
    expect(toOrder({ saleId: 5, createdAt: '0001-01-01T00:00:00Z' })).toMatchObject({ serialCode: null, customerName: 'Sin cliente', sellerName: '—', totalAmount: 0, createdAt: '' })
  })
})

