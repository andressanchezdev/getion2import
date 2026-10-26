// customers.service.test · pruebas de las llamadas de usuarios (POST /users y GET /users/{id}) y de direcciones y descuentos
// conecta con: customers.service y customers.details.service; el cliente HTTP está simulado (no hay red)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api'
import { fetchCustomerDetail, fetchCustomersPage } from './customers.service'
import { addDirection, deleteDirection, deleteDiscount, fetchDirections, fetchDiscounts } from './customers.details.service'

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  apiClient: { post: vi.fn(), get: vi.fn(), delete: vi.fn() },
}))

const ctx = { companyId: 3, userId: 7 }
const meta = { currentPage: 2, pageSize: 30, totalRecords: 75, totalPages: 3, hasNextPage: true, hasPrevPage: true }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('customers.service', () => {
  it('fetchCustomersPage: POST /users con empresa, página y tamaño; devuelve clientes y meta', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: [{ userId: 5, name: 'Ana', lastName: 'P' }], meta } })
    const page = await fetchCustomersPage(ctx, 2, 30)
    expect(apiClient.post).toHaveBeenCalledWith('/users', { companyId: 3, page: 2, pageSize: 30 })
    expect(page.items[0]).toMatchObject({ id: 5, fullName: 'Ana P' })
    expect(page.meta).toEqual(meta)
  })

  it('con data nulo la página queda vacía', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: null } })
    expect((await fetchCustomersPage(ctx, 1, 30)).items).toEqual([])
  })

  it('fetchCustomerDetail: GET /users/{id}', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: { userId: 5, name: 'Ana', comissionRate: 3 } } })
    const detail = await fetchCustomerDetail(5)
    expect(apiClient.get).toHaveBeenCalledWith('/users/5')
    expect(detail).toMatchObject({ id: 5, commissionRate: 3 })
  })
})

describe('customers.details.service', () => {
  it('fetchDirections: POST /directions con userId y la primera página', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: [{ directionId: 1, address: 'Calle 1' }] } })
    const result = await fetchDirections(5)
    expect(apiClient.post).toHaveBeenCalledWith('/directions', { userId: 5, page: 1, pageSize: 50 })
    expect(result[0]).toMatchObject({ id: 1, address: 'Calle 1' })
  })

  it('addDirection: POST /directions/register con userId y los campos del formulario', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} })
    const input = { address: 'Calle 1', neighborhood: 'Centro', city: 'Cali', department: 'Valle', country: 'Colombia', additionalInfo: '' }
    await addDirection(5, input)
    expect(apiClient.post).toHaveBeenCalledWith('/directions/register', { userId: 5, ...input })
  })

  it('deleteDirection: DELETE /directions/delete con el id en el cuerpo', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ data: {} })
    await deleteDirection(9)
    expect(apiClient.delete).toHaveBeenCalledWith('/directions/delete', { data: { directionId: 9 } })
  })

  it('fetchDiscounts: POST /discounts y deleteDiscount: DELETE /discounts/delete', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: [{ discountId: 3, rate: 10 }] } })
    expect((await fetchDiscounts(5))[0]).toMatchObject({ id: 3, rate: 10 })
    expect(apiClient.post).toHaveBeenCalledWith('/discounts', { userId: 5, page: 1, pageSize: 50 })
    vi.mocked(apiClient.delete).mockResolvedValue({ data: {} })
    await deleteDiscount(3)
    expect(apiClient.delete).toHaveBeenCalledWith('/discounts/delete', { data: { discountId: 3 } })
  })
})
