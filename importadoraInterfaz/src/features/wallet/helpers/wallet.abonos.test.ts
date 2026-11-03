// wallet.abonos.test · pruebas del historial de abonos: cómo se arma cada abono desde la API, los filtros y el total, y el cliente de la búsqueda de crédito
// conecta con: wallet.abonos y wallet.adapter (toAbonoRecord, toCreditCustomerOption); se corre con npm test
import { describe, expect, it } from 'vitest'
import { INITIAL_ABONO_FILTERS } from '../constants/wallet.constants'
import { toAbonoRecord, toCreditCustomerOption } from './wallet.adapter'
import { filterAbonos, hasAbonoFilters, totalAbonos } from './wallet.abonos'
import type { AbonoFilters, AbonoRecord } from '../types/wallet.types'

const abono = (id: number, overrides: Partial<AbonoRecord> = {}): AbonoRecord => ({
  id,
  serialCode: `REC-${id}`,
  date: '2026-10-31',
  customerName: `Cliente ${id}`,
  customerDoc: `90000${id}`,
  saleSerial: `PD-${id}`,
  method: 'cash',
  amount: id * 1000,
  status: 'verified',
  ...overrides,
})
const filters = (partial: Partial<AbonoFilters>): AbonoFilters => ({ ...INITIAL_ABONO_FILTERS, ...partial })

describe('toAbonoRecord', () => {
  it('arma el abono con lo que trae la API', () => {
    const record = toAbonoRecord({ id: 5, serialCode: 'REC-5', createdAt: '2026-10-31T10:00:00Z', customerName: 'Taller', customerDoc: '123', saleId: 77, paymentMethod: 'TRANSFER', reference: 'CUS-1', amount: 5000, status: 'pending' }, 0)
    expect(record).toEqual({ id: 5, serialCode: 'REC-5', date: '2026-10-31', customerName: 'Taller', customerDoc: '123', saleSerial: 'PD-77', method: 'transfer', reference: 'CUS-1', amount: 5000, status: 'pending', saleId: 77 })
  })

  it('rellena con textos neutros lo que falta y no inventa datos de ejemplo', () => {
    const record = toAbonoRecord({}, 2)
    expect(record).toMatchObject({ id: 3, serialCode: 'REC-1003', customerName: 'Cliente general', customerDoc: 'N/A', saleSerial: 'Abono a cartera', method: 'cash', amount: 0, status: 'verified' })
    expect(record.date).toBe('')
  })

  it('el estado «review» del backend es «pending» (en revisión) y trae la bodega y el comprobante', () => {
    const record = toAbonoRecord({ status: 'review', warehouseId: 2, warehouseCode: 'B-02', warehouseName: 'Norte', employeeName: 'Ana', proofUrl: 'http://x/p.png' }, 0)
    expect(record).toMatchObject({ status: 'pending', warehouseId: 2, warehouseCode: 'B-02', warehouseName: 'Norte', employeeName: 'Ana', proofUrl: 'http://x/p.png' })
  })

  it('el estado «voided» del backend es «void» (anulado)', () => {
    expect(toAbonoRecord({ status: 'voided' }, 0).status).toBe('void')
  })

  it('un estado desconocido se toma como verificado', () => {
    expect(toAbonoRecord({ status: 'raro' }, 0).status).toBe('verified')
  })
})

describe('toCreditCustomerOption', () => {
  it('toma el nombre comercial, el documento y el crédito actual', () => {
    expect(toCreditCustomerOption({ id: '8', businessName: 'Motos SAS', document: '901', creditLimit: 500000, creditDays: 45, creditEnabled: true })).toEqual({
      id: 8,
      name: 'Motos SAS',
      identification: '901',
      email: undefined,
      creditLimit: 500000,
      creditDays: 45,
      isCredit: true,
    })
  })

  it('sin plazo usa 30 días y sin nombre «Sin nombre»', () => {
    expect(toCreditCustomerOption({ id: 1 })).toMatchObject({ name: 'Sin nombre', creditDays: 30, creditLimit: 0, isCredit: false })
  })
})

describe('filterAbonos', () => {
  const items = [abono(1), abono(2, { method: 'transfer', reference: 'CUS-9' }), abono(3, { status: 'pending' })]

  it('sin filtros devuelve todo', () => {
    expect(filterAbonos(items, INITIAL_ABONO_FILTERS)).toHaveLength(3)
  })

  it('busca por recibo, cliente, documento, venta o referencia', () => {
    expect(filterAbonos(items, filters({ query: 'rec-3' })).map((i) => i.id)).toEqual([3])
    expect(filterAbonos(items, filters({ query: 'cus-9' })).map((i) => i.id)).toEqual([2])
    expect(filterAbonos(items, filters({ query: 'pd-1' })).map((i) => i.id)).toEqual([1])
  })

  it('filtra por método y por estado', () => {
    expect(filterAbonos(items, filters({ method: 'transfer' })).map((i) => i.id)).toEqual([2])
    expect(filterAbonos(items, filters({ status: 'pending' })).map((i) => i.id)).toEqual([3])
  })

  it('suma lo recaudado y avisa si hay filtros', () => {
    expect(totalAbonos(items)).toBe(6000)
    expect(hasAbonoFilters(INITIAL_ABONO_FILTERS)).toBe(false)
    expect(hasAbonoFilters(filters({ method: 'cash' }))).toBe(true)
  })
})
