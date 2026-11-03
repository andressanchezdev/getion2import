// quotations.service.test · pruebas de las llamadas de cotizaciones: lista con el WhatsApp del cliente, creación y envío
// conecta con: quotations.service; el cliente HTTP está simulado (no hay red)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api'
import { createQuotation, fetchQuotationDetail, fetchQuotations, updateQuotation } from './quotations.service'

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

const ctx = { companyId: 3, userId: 7 }
const meta = { currentPage: 1, pageSize: 200, totalRecords: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
    if (url === '/customers') return { data: { success: true, data: [{ id: 7, mobile: '3001234567', phone: '6041234' }, { id: 8, phone: '6045555' }], meta } }
    if (url === '/quotations/12') return { data: { success: true, data: { id: 12, customerId: 7, status: 'draft', total: 100, createdAt: '2026-10-20T10:00:00Z', items: [{ id: 1, productId: 5, productName: 'ANILLOS', quantity: 1, unitPrice: 100, lineTotal: 100 }] } } }
    return { data: { success: true, data: [{ id: 1, serialCode: 'COT-1', customerId: 7, customerName: 'Taller', employeeName: 'Ana', status: 'sent', total: 50, createdAt: '2026-10-20T10:00:00Z' }, { id: 2, customerId: 8, status: 'draft', total: 10, createdAt: '2026-10-21T10:00:00Z' }], meta } }
  })
})

describe('quotations.service', () => {
  it('fetchQuotations: GET /quotations y GET /customers; el WhatsApp es el celular o, si no hay, el teléfono', async () => {
    const list = await fetchQuotations(ctx)
    expect(apiClient.get).toHaveBeenCalledWith('/quotations', { params: { companyId: 3, page: 1, pageSize: 200 } })
    expect(apiClient.get).toHaveBeenCalledWith('/customers', { params: { companyId: 3, page: 1, pageSize: 200 } })
    expect(list.map((q) => q.whatsapp)).toEqual(['3001234567', '6045555'])
    expect(list[0]).toMatchObject({ serialCode: 'COT-1', employeeName: 'Ana', customerName: 'Taller' })
  })

  it('fetchQuotationDetail: trae los renglones', async () => {
    const detail = await fetchQuotationDetail(ctx, 12)
    expect(detail.items[0]).toMatchObject({ productId: 5, name: 'ANILLOS', quantity: 1 })
    expect(detail.whatsapp).toBe('3001234567')
  })

  it('createQuotation: POST /quotations y devuelve el id; updateQuotation: PUT con el estado', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: { id: 44 } } })
    expect(await createQuotation({ customerId: 7, items: [{ productId: 5, quantity: 2, unitPrice: 75000 }] })).toBe(44)
    expect(apiClient.post).toHaveBeenCalledWith('/quotations', { customerId: 7, items: [{ productId: 5, quantity: 2, unitPrice: 75000 }] })
    vi.mocked(apiClient.put).mockResolvedValue({ data: { success: true } })
    await updateQuotation(44, { status: 'sent' })
    expect(apiClient.put).toHaveBeenCalledWith('/quotations/44', { status: 'sent' })
  })
})
