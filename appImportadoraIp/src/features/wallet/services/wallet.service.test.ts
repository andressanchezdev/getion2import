// wallet.service.test · pruebas de las llamadas de cartera: lista, totales, facturas, abono y cambio de cupo (ruta y cuerpo de cada una)
// conecta con: wallet.service y wallet.payments.service; el cliente HTTP está simulado (no hay red)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api'
import { fetchCustomerInvoices, fetchWalletPage, fetchWalletSummary } from './wallet.service'
import { registerPayment, updateCredit } from './wallet.payments.service'

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  apiClient: { post: vi.fn(), put: vi.fn() },
}))

const ctx = { companyId: 3, userId: 7 }
const meta = { currentPage: 1, pageSize: 30, totalRecords: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('wallet.service', () => {
  it('fetchWalletPage: POST /wallet con empresa, página, tamaño y bodega; devuelve clientes y meta', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, data: [{ userId: 5, name: 'Ana', isCredit: true, creditAmount: 100 }], meta },
    })
    const page = await fetchWalletPage(ctx, 2, 30, 4)
    expect(apiClient.post).toHaveBeenCalledWith('/wallet', { companyId: 3, page: 2, pageSize: 30, warehouseId: 4 })
    expect(page.items[0]).toMatchObject({ id: 5, creditLimit: 100 })
    expect(page.meta).toEqual(meta)
  })

  it('sin bodega no manda warehouseId', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: null } })
    await fetchWalletPage(ctx, 1, 30)
    expect(apiClient.post).toHaveBeenCalledWith('/wallet', { companyId: 3, page: 1, pageSize: 30 })
  })

  it('fetchWalletSummary: POST /wallet/summary', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: { totalCreditExtended: 900, customersOverdue: 2 } } })
    const summary = await fetchWalletSummary(ctx, 4)
    expect(apiClient.post).toHaveBeenCalledWith('/wallet/summary', { companyId: 3, warehouseId: 4 })
    expect(summary).toMatchObject({ totalCreditExtended: 900, customersOverdue: 2 })
  })

  it('fetchCustomerInvoices: POST /wallet/internal con el userId del cliente', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: [{ saleId: 55, totalAmount: 1000, verifiedPayments: 100 }] } })
    const invoices = await fetchCustomerInvoices(ctx, 5, 4)
    expect(apiClient.post).toHaveBeenCalledWith('/wallet/internal', { companyId: 3, userId: 5, page: 1, pageSize: 50, warehouseId: 4 })
    expect(invoices[0]).toMatchObject({ saleId: 55, pendingBalance: 900 })
  })
})

describe('wallet.payments.service', () => {
  it('registerPayment: POST /payments/register como efectivo, con el cliente y el usuario que verifica', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } })
    await registerPayment(ctx, 5, { saleId: 55, amount: 300, remainingAmount: 200 }, 4)
    expect(apiClient.post).toHaveBeenCalledWith('/payments/register', {
      companyId: 3,
      userId: 5,
      userVerifyId: 7,
      paymentMethod: 'cash',
      reference: '',
      saleId: 55,
      amount: 300,
      remainingAmount: 200,
      warehouseId: 4,
    })
  })

  it('updateCredit: PUT /users/credit con userId, cupo, plazo y si tiene crédito', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} })
    await updateCredit({ customerId: 5, quota: 5000, days: 45, isCredit: true })
    expect(apiClient.put).toHaveBeenCalledWith('/users/credit', { userId: 5, quota: 5000, days: 45, isCredit: true })
  })
})
