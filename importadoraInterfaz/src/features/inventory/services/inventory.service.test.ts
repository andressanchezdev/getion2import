// inventory.service.test · pruebas de GET /stock para la tabla: parámetros (bodega, búsqueda, página) y conversión de las filas
// conecta con: inventory.service; el cliente HTTP está simulado (no hay red)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api'
import { fetchStockPage } from './inventory.service'

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  apiClient: { get: vi.fn() },
}))

const meta = { currentPage: 2, pageSize: 20, totalRecords: 40, totalPages: 2, hasNextPage: false, hasPrevPage: true }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(apiClient.get).mockResolvedValue({
    data: { success: true, data: [{ stockId: 1, warehouseId: 2, productId: 5, productCode: 'A1', productName: 'ANILLOS', available: 10, reserved: 4, sellable: 6, minStock: 3 }], meta },
  })
})

describe('fetchStockPage', () => {
  it('pide el stock de la bodega con la búsqueda y la página, y la compañía solo si existe', async () => {
    const page = await fetchStockPage({ companyId: 3, userId: 7 }, 2, 2, ' anillos ')
    expect(apiClient.get).toHaveBeenCalledWith('/stock', { params: { companyId: 3, warehouseId: 2, q: 'anillos', page: 2, pageSize: 20 } })
    expect(page.items[0]).toMatchObject({ productCode: 'A1', available: 10, reserved: 4, sellable: 6, level: 'ok' })
    expect(page.meta).toEqual(meta)
  })

  it('el superadmin sin compañía elegida no manda companyId y sin búsqueda no manda q', async () => {
    await fetchStockPage({ companyId: 0, userId: 1 }, 1, 1, '')
    expect(apiClient.get).toHaveBeenCalledWith('/stock', { params: { warehouseId: 1, page: 1, pageSize: 20 } })
  })
})
