// companies.service.test · pruebas de GET /companies: junta páginas y deja solo las compañías activas
// conecta con: companies.service; el cliente HTTP está simulado (no hay red)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api'
import { fetchCompanies } from './companies.service'

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  apiClient: { get: vi.fn() },
}))

const meta = (hasNextPage: boolean) => ({ currentPage: 1, pageSize: 200, totalRecords: 3, totalPages: 1, hasNextPage, hasPrevPage: false })

beforeEach(() => vi.clearAllMocks())

describe('fetchCompanies', () => {
  it('pide de a 200, junta las páginas y deja las activas', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: { success: true, data: [{ id: 1, name: ' Importadora Uno ', city: 'Cali' }], meta: meta(true) } })
      .mockResolvedValueOnce({ data: { success: true, data: [{ id: 2, name: 'Dos', isActive: false }, { id: 3, name: '' }], meta: meta(false) } })
    const list = await fetchCompanies()
    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/companies', { params: { page: 1, pageSize: 200 } })
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/companies', { params: { page: 2, pageSize: 200 } })
    expect(list).toEqual([
      { id: 1, name: 'Importadora Uno', city: 'Cali', isActive: true },
      { id: 3, name: 'Compañía 3', city: undefined, isActive: true },
    ])
  })
})
