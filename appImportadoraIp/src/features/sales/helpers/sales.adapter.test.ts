// sales.adapter.test · pruebas de la conversión del historial de ventas y de los carritos pendientes del backend
// conecta con: sales.adapter; se corre con npm test
import { describe, expect, it } from 'vitest'
import { toPendingCart, toSaleRow } from './sales.adapter'

describe('toSaleRow', () => {
  const dto = {
    saleId: 91486,
    serialCode: 4521,
    userId: 694,
    sellerId: 315,
    invoiceStatus: 'verification',
    totalAmount: 380000,
    created_at: '2026-10-20T15:30:00Z',
    userInformation: { userId: 694, name: 'ventas mostrador' },
    sellerInformation: { userId: 315, name: 'Test Updated' },
    paymentInformation: { amount: 100000, paymentId: 8 },
  }

  it('arma número, cliente, vendedor, estado, total y fecha', () => {
    expect(toSaleRow(dto)).toEqual({
      id: 91486,
      serialCode: 4521,
      customerName: 'ventas mostrador',
      sellerName: 'Test Updated',
      status: 'verification',
      totalAmount: 380000,
      paidAmount: 100000,
      createdAt: '2026-10-20',
    })
  })

  it('la fecha 0001-01-01 del backend queda vacía', () => {
    expect(toSaleRow({ ...dto, created_at: '0001-01-01T00:00:00Z' }).createdAt).toBe('')
  })

  it('sin nombres usa el número de usuario; sin cliente lo dice', () => {
    const row = toSaleRow({ saleId: 1, userId: 7, sellerId: 8 })
    expect(row).toMatchObject({ customerName: 'Usuario 7', sellerName: 'Usuario 8', serialCode: null, totalAmount: 0, paidAmount: 0, status: '' })
    expect(toSaleRow({ saleId: 2 }).customerName).toBe('Sin cliente')
  })
})

describe('toPendingCart', () => {
  it('convierte un carrito guardado con su cliente, líneas y unidades', () => {
    expect(
      toPendingCart({ uuid: 'abc', userId: 21, count: 3, quantities: 7, totalAmount: 54000, created_at: '2026-10-21T10:00:00Z', userInformation: { name: 'Ana' }, sellerInformation: { name: 'Luis' } })
    ).toEqual({ uuid: 'abc', customerId: 21, customerName: 'Ana', sellerName: 'Luis', lines: 3, units: 7, totalAmount: 54000, createdAt: '2026-10-21' })
  })

  it('un userId en 0 significa sin cliente', () => {
    expect(toPendingCart({ uuid: 'x', userId: 0 })).toMatchObject({ customerId: null, customerName: 'Sin cliente', lines: 0, units: 0 })
  })
})
