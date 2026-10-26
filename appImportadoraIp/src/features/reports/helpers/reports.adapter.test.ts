// reports.adapter.test · pruebas de la conversión de reportes del backend a tarjetas de métricas, y de las fechas
// conecta con: reports.adapter y reports.dates; se corre con npm test
import { describe, expect, it } from 'vitest'
import { daysAgoString, isValidRange, toDayString } from './reports.dates'
import { toCustomerMetrics, toFinancialMetrics, toInventoryMetrics, toSalesMetrics } from './reports.adapter'

const byKey = (metrics: { key: string; value: number }[]) => Object.fromEntries(metrics.map((metric) => [metric.key, metric.value]))

describe('toSalesMetrics', () => {
  it('convierte los totales de /sales/summary', () => {
    const metrics = toSalesMetrics({ totalSales: 12, totalCompletedSales: 9, totalPendingSales: 2, totalCancelledSales: 1, totalRevenue: 5000, totalRevenueCompleted: 4000, averageOrderValue: 416.6 })
    expect(byKey(metrics)).toEqual({ totalSales: 12, completed: 9, pending: 2, cancelled: 1, revenue: 5000, revenueCompleted: 4000, average: 416.6 })
    expect(metrics.find((m) => m.key === 'revenue')?.format).toBe('money')
    expect(metrics.find((m) => m.key === 'totalSales')?.format).toBe('count')
  })

  it('un campo que falta queda en 0', () => {
    expect(byKey(toSalesMetrics({}))).toMatchObject({ totalSales: 0, revenue: 0 })
  })
})

describe('otras métricas', () => {
  it('financiero: el margen va como porcentaje', () => {
    const metrics = toFinancialMetrics({ totalRevenue: 100, grossProfit: 30, grossMargin: 30, netRevenue: 25, accountsReceivable: 7 })
    expect(byKey(metrics)).toMatchObject({ revenue: 100, grossProfit: 30, grossMargin: 30, netRevenue: 25, receivable: 7 })
    expect(metrics.find((m) => m.key === 'grossMargin')?.format).toBe('percent')
  })

  it('clientes e inventario', () => {
    expect(byKey(toCustomerMetrics({ totalCustomers: 563, activeCustomers: 40, newCustomers: 3 }))).toMatchObject({ total: 563, active: 40, new: 3 })
    expect(byKey(toInventoryMetrics({ totalProducts: 8148, totalStock: 20000, totalValue: 9e8, lowStockCount: 12, outOfStockCount: 4 }))).toMatchObject({ products: 8148, stock: 20000, value: 9e8, low: 12, out: 4 })
  })

  it('ignora valores no numéricos', () => {
    expect(byKey(toInventoryMetrics({ totalValue: Number.NaN })).value).toBe(0)
  })
})

describe('reports.dates', () => {
  const NOW = new Date(2026, 9, 24, 21, 30) // 24 oct 2026, 9:30 p. m. hora local

  it('usa la fecha local, no la UTC', () => {
    expect(toDayString(NOW)).toBe('2026-10-24')
  })

  it('resta días y cruza de mes', () => {
    expect(daysAgoString(30, NOW)).toBe('2026-09-24')
    expect(daysAgoString(24, NOW)).toBe('2026-09-30')
  })

  it('valida el rango', () => {
    expect(isValidRange('2026-10-01', '2026-10-24')).toBe(true)
    expect(isValidRange('2026-10-24', '2026-10-24')).toBe(true)
    expect(isValidRange('2026-10-25', '2026-10-24')).toBe(false)
    expect(isValidRange('', '2026-10-24')).toBe(false)
  })
})
