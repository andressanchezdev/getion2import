// reports.service.test · pruebas de las llamadas de reportes: cuerpo enviado y conversión
// conecta con: reports.service; el cliente HTTP está simulado (no hay red)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api'
import { fetchCustomerReport, fetchFinancialReport, fetchInventoryReport, fetchSalesSummary } from './reports.service'

vi.mock('@/api', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/api')
  return { ...actual, apiClient: { post: vi.fn() } }
})

const ctx = { companyId: 1, userId: 948 }
const range = { start: '2026-10-01', end: '2026-10-24' }

beforeEach(() => vi.clearAllMocks())

describe('reports.service', () => {
  it('resumen de ventas: manda fechas y bodega', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true, data: { totalSales: 3 } } })
    const result = await fetchSalesSummary(ctx, range, 4)
    expect(apiClient.post).toHaveBeenCalledWith('/sales/summary', { companyId: 1, startDate: '2026-10-01', endDate: '2026-10-24', warehouseId: 4 })
    expect(result.metrics.find((m) => m.key === 'totalSales')?.value).toBe(3)
  })

  it('resumen de ventas sin bodega no manda warehouseId', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true, data: {} } })
    await fetchSalesSummary(ctx, range)
    expect(vi.mocked(apiClient.post).mock.calls[0][1]).not.toHaveProperty('warehouseId')
  })

  it('financiero y clientes: mandan el rango y devuelven generatedAt', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: { generatedAt: '2026-10-24T12:00:00Z', totalRevenue: 9 } } })
    const financial = await fetchFinancialReport(ctx, range)
    expect(apiClient.post).toHaveBeenCalledWith('/reports/financial', { companyId: 1, startDate: '2026-10-01', endDate: '2026-10-24' })
    expect(financial.generatedAt).toBe('2026-10-24T12:00:00Z')
    await fetchCustomerReport(ctx, range)
    expect(apiClient.post).toHaveBeenLastCalledWith('/reports/customers', { companyId: 1, startDate: '2026-10-01', endDate: '2026-10-24' })
  })

  it('inventario: solo empresa y bodega, sin fechas', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true, data: { totalProducts: 5 } } })
    const result = await fetchInventoryReport(ctx, 4)
    expect(apiClient.post).toHaveBeenCalledWith('/reports/inventory', { companyId: 1, warehouseId: 4 })
    expect(result.metrics.find((m) => m.key === 'products')?.value).toBe(5)
  })

  it('acepta una respuesta sin data', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true } })
    expect((await fetchInventoryReport(ctx)).metrics.every((m) => m.value === 0)).toBe(true)
  })
})
