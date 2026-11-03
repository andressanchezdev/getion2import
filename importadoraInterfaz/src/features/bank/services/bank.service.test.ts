// bank.service.test · pruebas de las llamadas de la conciliación bancaria: subir el PDF, listar con filtros, confirmar, ignorar y pagos por verificar
// conecta con: bank.service; el cliente HTTP está simulado (no hay red)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api'
import { confirmBankRecord, fetchBankRecords, fetchPendingTransferPayments, ignoreBankRecord, uploadBankStatement } from './bank.service'
import { INITIAL_BANK_FILTERS } from '../constants/bank.constants'

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

const meta = { currentPage: 1, pageSize: 20, totalRecords: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('bank.service', () => {
  it('uploadBankStatement: manda el PDF en el campo file y devuelve lo que se leyó', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: { totalProcessed: 12, totalInserted: 9, accountInfo: 'Cta 014' } } })
    const file = new File(['%PDF'], 'extracto.pdf', { type: 'application/pdf' })
    const result = await uploadBankStatement(file)
    const [url, body] = vi.mocked(apiClient.post).mock.calls[0] as [string, FormData]
    expect(url).toBe('/bank-statements/upload-pdf')
    expect((body.get('file') as File).name).toBe('extracto.pdf')
    expect(result).toEqual({ processed: 12, inserted: 9, account: 'Cta 014' })
  })

  it('fetchBankRecords: solo manda los filtros que tienen valor', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [{ id: 1, bankName: 'B', accountNumber: '1', movementDate: '2026-10-28', description: 'PAGO', branchChannel: 'X', amount: 10, isIncome: true, status: 'pending' }], meta } })
    const page = await fetchBankRecords({ ...INITIAL_BANK_FILTERS, status: 'all', query: ' qr ', from: '2026-10-01' }, 2, 20)
    expect(apiClient.get).toHaveBeenCalledWith('/bank-statements/records', { params: { page: 2, pageSize: 20, description: 'qr', from: '2026-10-01' } })
    expect(page.items[0]).toMatchObject({ id: 1, status: 'pending', date: '2026-10-28' })
    expect(page.meta.totalRecords).toBe(1)
  })

  it('fetchBankRecords: el estado pendiente se manda como filtro', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: null, meta } })
    const page = await fetchBankRecords(INITIAL_BANK_FILTERS, 1, 20)
    expect(apiClient.get).toHaveBeenCalledWith('/bank-statements/records', { params: { page: 1, pageSize: 20, status: 'pending' } })
    expect(page.items).toEqual([])
  })

  it('confirmBankRecord e ignoreBankRecord hacen PATCH a sus rutas', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { success: true } })
    await confirmBankRecord(5, 77, ' ok ')
    expect(apiClient.patch).toHaveBeenLastCalledWith('/bank-statements/records/5/confirm', { paymentId: 77, notes: 'ok' })
    await ignoreBankRecord(6)
    expect(apiClient.patch).toHaveBeenLastCalledWith('/bank-statements/records/6/ignore', { notes: undefined })
  })

  it('fetchPendingTransferPayments: pide los pagos en revisión por transferencia', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [{ id: 3, serialCode: 'PAG-3', saleSerial: 'PD-7', customerName: 'Ana', amount: 5000, createdAt: '2026-10-28' }], meta } })
    const payments = await fetchPendingTransferPayments()
    expect(apiClient.get).toHaveBeenCalledWith('/payments', { params: { status: 'review', method: 'transfer', page: 1, pageSize: 100 } })
    expect(payments[0]).toMatchObject({ id: 3, serial: 'PAG-3' })
  })
})
