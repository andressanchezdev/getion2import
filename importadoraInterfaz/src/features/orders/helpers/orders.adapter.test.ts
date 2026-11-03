// orders.adapter.test · pruebas de la conversión de lo que responde la API en pedidos (filas, detalle y contadores), la búsqueda de la tabla y las acciones por fila
// conecta con: orders.adapter y orders.actions; se corre con npm test
import { describe, expect, it } from 'vitest'
import { getOrderActions } from './orders.actions'
import { durationLabel } from './orders.labels'
import { filterOrders, orderChannel, orderSerial, toOrderDetail, toOrderRow, toStageCounts, toStageEntry, toStageKey } from './orders.adapter'
import type { SaleDto } from '../types/orders.api.types'

const sale: SaleDto = {
  id: 77,
  serialCode: 'PD-1234',
  customerName: 'Taller El Pistón',
  employeeName: 'Ana Ruiz',
  paymentMethod: 'transfer',
  immediatePicking: false,
  status: 'open',
  currentStage: 'picking',
  priceTier: 'p2',
  total: 100000,
  paidTotal: 100000,
  createdAt: '2026-10-28T15:30:00Z',
  updatedAt: '2026-10-29T10:00:00Z',
  items: [{ id: 1, productId: 5, stockId: 3, productCode: 'A-1', productName: 'Kit cilindro', quantity: 2, unitPrice: 50000, discount: 0, lineTotal: 100000 }],
}

describe('orderSerial', () => {
  it('usa el consecutivo de la API o «Venta id» si falta', () => {
    expect(orderSerial('PD-9', 1)).toBe('PD-9')
    expect(orderSerial('', 9)).toBe('Venta 9')
    expect(orderSerial(undefined, 9)).toBe('Venta 9')
  })
})

describe('orderChannel y toStageKey', () => {
  it('el picking inmediato es el único canal distinto', () => {
    expect(orderChannel({ immediatePicking: true })).toBe('immediate')
    expect(orderChannel({ immediatePicking: false })).toBe('standard')
    expect(orderChannel({})).toBe('standard')
  })

  it('solo las cinco etapas con pestaña son una etapa de la tabla', () => {
    expect(toStageKey('packing')).toBe('packing')
    expect(toStageKey('sent')).toBeNull()
    expect(toStageKey('cancelled')).toBeNull()
    expect(toStageKey(undefined)).toBeNull()
  })
})

describe('toStageCounts', () => {
  it('arma un contador por etapa; el que falta queda en 0', () => {
    expect(toStageCounts({ verification: 3, dispatch: 1 })).toEqual({ verification: 3, picking: 0, packing: 0, invoicing: 0, dispatch: 1 })
  })
})

describe('toOrderRow', () => {
  it('convierte la venta de la API en una fila de la tabla', () => {
    expect(toOrderRow(sale, 'picking')).toEqual({
      id: 77,
      serial: 'PD-1234',
      stage: 'picking',
      channel: 'standard',
      customerName: 'Taller El Pistón',
      sellerName: 'Ana Ruiz',
      paymentMethod: 'transfer',
      totalAmount: 100000,
      createdAt: '2026-10-28',
      paused: false,
      paymentVerified: true,
      locationVerified: false,
      paidAmount: 100000,
      creditAmount: 0,
      confirmed: false,
      currentStage: 'picking',
    })
  })

  it('sin cliente ni vendedor usa textos neutros; con lo pagado menor al total el pago no está verificado', () => {
    const row = toOrderRow({ ...sale, customerName: null, employeeName: '', paidTotal: 10 }, 'verification')
    expect(row).toMatchObject({ customerName: 'Sin cliente', sellerName: '—', paymentVerified: false })
  })

  it('la ubicación se considera verificada cuando el pedido ya pasó el alistamiento', () => {
    expect(toOrderRow({ ...sale, currentStage: 'packing' }, 'packing').locationVerified).toBe(true)
    expect(toOrderRow({ ...sale, currentStage: 'verification' }, 'verification').locationVerified).toBe(false)
  })

  it('una fecha inválida o sin dato queda vacía', () => {
    expect(toOrderRow({ ...sale, createdAt: '0001-01-01T00:00:00Z' }, 'picking').createdAt).toBe('')
    expect(toOrderRow({ ...sale, createdAt: undefined }, 'picking').createdAt).toBe('')
  })
})

describe('toOrderDetail', () => {
  const payments = [{ id: 4, method: 'transfer', amount: 100000, status: 'verified', createdAt: '2026-10-28T16:00:00Z' }]

  it('arma el detalle con cliente, vendedor, renglones y pagos', () => {
    const detail = toOrderDetail(sale, payments)
    expect(detail).toMatchObject({
      id: 77,
      serial: 'PD-1234',
      stage: 'picking',
      channel: 'standard',
      status: 'open',
      totalAmount: 100000,
      cancelled: false,
      paymentVerified: true,
    })
    expect(detail.customer).toMatchObject({ name: 'Taller El Pistón', priceType: 'p2' })
    expect(detail.seller.name).toBe('Ana Ruiz')
    expect(detail.lines).toEqual([{ id: 1, productId: 5, code: 'A-1', title: 'Kit cilindro', brand: '', quantity: 2, price: 50000, discount: 0 }])
    expect(detail.payments).toEqual([{ id: 4, method: 'transfer', amount: 100000, status: 'verified', createdAt: '2026-10-28T16:00:00Z' }])
  })

  it('un pedido anulado queda marcado y sin renglones ni pagos no se rompe', () => {
    const detail = toOrderDetail({ ...sale, status: 'cancelled', items: null }, [])
    expect(detail.cancelled).toBe(true)
    expect(detail.lines).toEqual([])
    expect(detail.payments).toEqual([])
  })
})

describe('filterOrders', () => {
  const rows = [toOrderRow(sale, 'picking'), toOrderRow({ ...sale, id: 78, serialCode: 'PD-9', customerName: 'Moto Ávila' }, 'picking')]

  it('sin texto deja todos', () => {
    expect(filterOrders(rows, '  ')).toHaveLength(2)
  })

  it('busca por serie, cliente, vendedor o método, sin tildes ni mayúsculas', () => {
    expect(filterOrders(rows, 'pd-9').map((r) => r.id)).toEqual([78])
    expect(filterOrders(rows, 'avila').map((r) => r.id)).toEqual([78])
    expect(filterOrders(rows, 'ANA')).toHaveLength(2)
    expect(filterOrders(rows, 'transfer')).toHaveLength(2)
    expect(filterOrders(rows, 'zzz')).toEqual([])
  })
})

describe('getOrderActions', () => {
  const row = toOrderRow({ id: 1, serialCode: 'PD-1' }, 'picking')

  it('ofrece anular solo con permiso', () => {
    expect(getOrderActions(row, false).map((a) => a.key)).toEqual(['detail', 'copy'])
    expect(getOrderActions(row, true).map((a) => a.key)).toEqual(['detail', 'copy', 'cancel'])
  })
})

describe('pago cubierto y verificación confirmada', () => {
  it('lo verificado más lo dejado a crédito cubre el total', () => {
    expect(toOrderRow({ ...sale, paidTotal: 40000, creditAmount: 60000 }, 'verification').paymentVerified).toBe(true)
    expect(toOrderRow({ ...sale, paidTotal: 40000, creditAmount: 0 }, 'verification').paymentVerified).toBe(false)
  })

  it('el pedido en verification_ok se marca como confirmado y trae lo pagado y lo dejado a crédito', () => {
    const row = toOrderRow({ ...sale, currentStage: 'verification_ok', paidTotal: 30000, creditAmount: 70000 }, 'picking')
    expect(row).toMatchObject({ confirmed: true, paidAmount: 30000, creditAmount: 70000 })
  })
})

describe('historial de etapas', () => {
  it('convierte una etapa del historial y deja neutro lo que falta', () => {
    expect(toStageEntry({ stage: 'verification', employeeName: 'Ana', enteredAt: '2026-10-28T15:30:00Z', leftAt: '2026-10-28T16:00:00Z', minutes: 30 })).toEqual({
      stage: 'verification',
      employeeName: 'Ana',
      enteredAt: '2026-10-28T15:30:00Z',
      leftAt: '2026-10-28T16:00:00Z',
      minutes: 30,
    })
    expect(toStageEntry({ stage: 'picking', enteredAt: '2026-10-28T16:00:00Z' })).toMatchObject({ employeeName: '—', leftAt: '', minutes: 0 })
  })

  it('el detalle trae el historial que se le pasa y vacío si no hay', () => {
    expect(toOrderDetail(sale, [], [{ stage: 'verification', enteredAt: '2026-10-28T15:30:00Z', minutes: 5 }]).history).toHaveLength(1)
    expect(toOrderDetail(sale, []).history).toEqual([])
  })
})

describe('durationLabel', () => {
  it('minutos, horas y horas con minutos', () => {
    expect([durationLabel(45), durationLabel(120), durationLabel(130)]).toEqual(['45 min', '2 h', '2 h 10 min'])
  })
})
