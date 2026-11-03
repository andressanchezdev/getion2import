// audit.service.test · pruebas de GET /audit-logs: filtros, compañía del superadmin y conversión
// conecta con: audit.service; el cliente HTTP está simulado (no hay red)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api'
import { fetchAuditPage } from './audit.service'

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  apiClient: { get: vi.fn() },
}))

const meta = { currentPage: 1, pageSize: 20, totalRecords: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [{ id: 1, entity: 'customers', action: 'CUSTOMER_UPDATED', createdAt: '2026-10-30T10:00:00Z' }], meta } })
})

describe('fetchAuditPage', () => {
  it('pide la compañía, la página y solo los filtros puestos', async () => {
    const page = await fetchAuditPage({ companyId: 3, userId: 7 }, 2, { entity: 'customers', action: '' })
    expect(apiClient.get).toHaveBeenCalledWith('/audit-logs', { params: { companyId: 3, entity: 'customers', page: 2, pageSize: 20 } })
    expect(page.items[0]).toMatchObject({ id: 1, entityLabel: 'Clientes', actionLabel: 'Customer updated' })
    expect(page.meta).toEqual(meta)
  })

  it('el superadmin sin compañía elegida no manda companyId (ve todas)', async () => {
    await fetchAuditPage({ companyId: 0, userId: 1 }, 1, { entity: '', action: '' })
    expect(apiClient.get).toHaveBeenCalledWith('/audit-logs', { params: { page: 1, pageSize: 20 } })
  })
})
