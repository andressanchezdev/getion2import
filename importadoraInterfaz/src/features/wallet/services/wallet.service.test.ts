// wallet.service.test · pruebas de las llamadas de cartera: clientes con crédito, totales, ventas a crédito, abonos y cambio de cupo
// conecta con: wallet.service y wallet.payments.service; el cliente HTTP está simulado (no hay red)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api'
import { fetchCustomerInvoices, fetchWalletPage, fetchWalletSummary } from './wallet.service'
import { registerPayment, updateCredit } from './wallet.payments.service'

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

const ctx = { companyId: 3, userId: 7 }
const meta = { currentPage: 1, pageSize: 30, totalRecords: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false }
const customers = [{ id: 7, document: '900', name: 'Taller', creditEnabled: true, creditLimit: 1_000_000, creditDays: 30 }]

// responde según la ruta: lista de clientes, selector de cupo, reporte o ventas
const mockApi = () =>
  vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
    if (url === '/customers/selector') return { data: { success: true, data: [{ id: 7, availableCredit: 600_000 }] } }
    if (url === '/reports/wallet') return { data: { success: true, data: { totalOutstandingDebt: -400_000, totalCustomersWithCredit: 1 } } }
    if (url === '/sales') return { data: { success: true, data: [{ id: 5, serialCode: 'PD-5', total: 100, paidTotal: 0, status: 'open' }, { id: 6, total: 50, status: 'cancelled' }], meta } }
    return { data: { success: true, data: customers, meta } }
  })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('wallet.service', () => {
  it('fetchWalletPage: GET /customers con creditEnabled y el cupo disponible del selector', async () => {
    mockApi()
    const page = await fetchWalletPage(ctx, 2, 30)
    expect(apiClient.get).toHaveBeenCalledWith('/customers', { params: { companyId: 3, creditEnabled: true, page: 2, pageSize: 30 } })
    expect(apiClient.get).toHaveBeenCalledWith('/customers/selector')
    expect(page.items[0]).toMatchObject({ id: 7, usedCredit: 400_000, availableCredit: 600_000 })
    expect(page.meta).toEqual(meta)
  })

  it('fetchWalletSummary: junta los clientes con crédito, el selector y GET /reports/wallet', async () => {
    mockApi()
    const summary = await fetchWalletSummary(ctx)
    expect(apiClient.get).toHaveBeenCalledWith('/customers', { params: { companyId: 3, creditEnabled: true, page: 1, pageSize: 200 } })
    expect(apiClient.get).toHaveBeenCalledWith('/reports/wallet')
    expect(summary).toMatchObject({ totalCreditExtended: 1_000_000, totalOutstandingDebt: 400_000, totalAvailableCredit: 600_000, totalCustomersWithCredit: 1 })
  })

  it('fetchCustomerInvoices: GET /sales del cliente a crédito y deja fuera las anuladas', async () => {
    mockApi()
    const invoices = await fetchCustomerInvoices(ctx, 7)
    expect(apiClient.get).toHaveBeenCalledWith('/sales', { params: { companyId: 3, customerId: 7, paymentMethod: 'credit', page: 1, pageSize: 50 } })
    expect(invoices.map((invoice) => invoice.saleId)).toEqual([5])
  })

  it('el superadmin (sin compañía) no manda companyId', async () => {
    mockApi()
    await fetchWalletPage({ companyId: 0, userId: 1 }, 1, 30)
    expect(apiClient.get).toHaveBeenCalledWith('/customers', { params: { creditEnabled: true, page: 1, pageSize: 30 } })
  })
})

describe('wallet.payments.service', () => {
  it('registerPayment: crea el pago en efectivo (POST /payments) y lo verifica (POST /payments/:id/verify)', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true, data: { id: 41 } } }).mockResolvedValueOnce({ data: { success: true } })
    await registerPayment(ctx, 7, { saleId: 5, amount: 30_000, remainingAmount: 70_000 })
    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/payments', { saleId: 5, method: 'cash', amount: 30_000 })
    expect(apiClient.post).toHaveBeenNthCalledWith(2, '/payments/41/verify', {})
  })

  it('registerPayment por transferencia: manda referencia y comprobante y NO lo verifica (queda en revisión)', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true, data: { id: 42 } } })
    await registerPayment(ctx, 7, { saleId: 5, amount: 30_000, remainingAmount: 0 }, { method: 'transfer', reference: 'CUS-9', proofUrl: 'data:image/png;base64,x' })
    expect(apiClient.post).toHaveBeenCalledTimes(1)
    expect(apiClient.post).toHaveBeenCalledWith('/payments', { saleId: 5, method: 'transfer', amount: 30_000, reference: 'CUS-9', proofUrl: 'data:image/png;base64,x' })
  })

  it('si la API no devuelve el id del pago avisa y no verifica', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true, data: null } })
    await expect(registerPayment(ctx, 7, { saleId: 5, amount: 1, remainingAmount: 0 })).rejects.toMatchObject({ userFriendlyMessage: expect.stringContaining('no se pudo verificar') })
    expect(apiClient.post).toHaveBeenCalledTimes(1)
  })

  it('updateCredit: PUT /customers/:id con cupo, plazo y si tiene crédito', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} })
    await updateCredit({ customerId: 7, quota: 2_000_000, days: 45, isCredit: true })
    expect(apiClient.put).toHaveBeenCalledWith('/customers/7', { creditEnabled: true, creditLimit: 2_000_000, creditDays: 45 })
  })
})
