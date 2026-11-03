// customers.service.test · pruebas de las llamadas de clientes (GET /customers, GET /customers/:id, POST /customers), de las direcciones y de los descuentos
// conecta con: customers.service y customers.details.service; el cliente HTTP está simulado (no hay red)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api'
import { createCustomer, customerExists, fetchCustomerDetail, fetchCustomersPage } from './customers.service'
import { addDirection, deleteDirection, deleteDiscount, fetchDirections, fetchDiscounts } from './customers.details.service'

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  apiClient: { post: vi.fn(), get: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

const ctx = { companyId: 3, userId: 7 }
const meta = { currentPage: 2, pageSize: 30, totalRecords: 75, totalPages: 3, hasNextPage: true, hasPrevPage: true }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('customers.service', () => {
  it('fetchCustomersPage: GET /customers con compañía, página y tamaño; devuelve clientes y meta', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [{ id: 5, name: 'Ana', lastName: 'P' }], meta } })
    const page = await fetchCustomersPage(ctx, 2, 30)
    expect(apiClient.get).toHaveBeenCalledWith('/customers', { params: { companyId: 3, page: 2, pageSize: 30 } })
    expect(page.items[0]).toMatchObject({ id: 5, fullName: 'Ana P' })
    expect(page.meta).toEqual(meta)
  })

  it('con data nulo la página queda vacía', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: null } })
    expect((await fetchCustomersPage(ctx, 1, 30)).items).toEqual([])
  })

  it('fetchCustomerDetail: GET /customers/:id', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: { id: 5, name: 'Ana', documentType: 'NIT', document: '900' } } })
    const detail = await fetchCustomerDetail(5)
    expect(apiClient.get).toHaveBeenCalledWith('/customers/5')
    expect(detail).toMatchObject({ id: 5, company: { nit: '900' } })
  })

  it('createCustomer: POST /customers con el cuerpo del formulario', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: { id: 9, name: 'Luis' } } })
    const body = { documentType: 'CC', document: '123456', personType: 'natural', name: 'Luis', phone: '3001234567' }
    const customer = await createCustomer(body)
    expect(apiClient.post).toHaveBeenCalledWith('/customers', body)
    expect(customer).toMatchObject({ id: 9, fullName: 'Luis' })
  })

  it('customerExists: busca por texto y solo cuenta una coincidencia exacta', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [{ id: 1, document: '123456', email: 'Ana@X.co' }] } })
    expect(await customerExists('document', '123456')).toBe(true)
    expect(await customerExists('email', 'ana@x.co')).toBe(true)
    expect(await customerExists('document', '12345')).toBe(false) // parecido, pero no igual
    expect(apiClient.get).toHaveBeenCalledWith('/customers/search', { params: { q: '123456', page: 1, pageSize: 20 } })
  })
})

describe('customers.details.service', () => {
  const customerWith = (addresses: unknown[]) => ({ data: { success: true, data: { id: 5, addresses } } })

  it('fetchDirections: lee las direcciones de GET /customers/:id', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(customerWith([{ id: 1, address: 'Calle 1' }]))
    const result = await fetchDirections(5)
    expect(apiClient.get).toHaveBeenCalledWith('/customers/5')
    expect(result[0]).toMatchObject({ id: 1, address: 'Calle 1' })
  })

  it('addDirection: guarda con PUT /customers/:id la lista completa con la dirección nueva', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(customerWith([{ id: 1, address: 'Calle 1' }]))
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} })
    const input = { address: 'Calle 2', neighborhood: 'Centro', city: 'Cali', department: 'Valle', country: 'Colombia', additionalInfo: '' }
    await addDirection(5, input)
    const [url, body] = vi.mocked(apiClient.put).mock.calls[0] as [string, { addresses: { id: number; address: string }[] }]
    expect(url).toBe('/customers/5')
    expect(body.addresses.map((a) => [a.id, a.address])).toEqual([[1, 'Calle 1'], [2, 'Calle 2']])
  })

  it('deleteDirection: guarda la lista sin la dirección borrada', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(customerWith([{ id: 1, address: 'A' }, { id: 2, address: 'B' }]))
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} })
    await deleteDirection(5, 1)
    const body = vi.mocked(apiClient.put).mock.calls[0][1] as { addresses: { id: number }[] }
    expect(body.addresses.map((a) => a.id)).toEqual([2])
  })

  it('descuentos: la API todavía no los tiene; la lista queda vacía y borrar avisa', async () => {
    expect(await fetchDiscounts()).toEqual([])
    await expect(deleteDiscount()).rejects.toMatchObject({ userFriendlyMessage: expect.stringContaining('todavía no permite') })
    expect(apiClient.post).not.toHaveBeenCalled()
  })
})
