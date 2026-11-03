// orders.verify.test · pruebas de aprobar el comprobante de una transferencia: verifica el pago en revisión o crea uno con el comprobante y lo verifica
// conecta con: orders.service (verifyTransferPayment); el cliente HTTP está simulado (no hay red); se corre con npm test
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api'
import { verifyTransferPayment } from './orders.service'
import type { OrderDetail } from '../types/orders.types'

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  apiClient: { get: vi.fn(), post: vi.fn() },
}))

const order = (payments: Array<{ id: number; status: string }>): OrderDetail =>
  ({ id: 40, totalAmount: 150000, paymentProofUrl: 'https://x/comprobante.png', paymentReference: 'CUS-1', payments }) as unknown as OrderDetail

beforeEach(() => {
  vi.clearAllMocks()
})

describe('verifyTransferPayment', () => {
  it('si hay un pago en revisión, solo lo verifica', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} })
    await verifyTransferPayment(order([{ id: 7, status: 'verified' }, { id: 8, status: 'review' }]))
    expect(apiClient.post).toHaveBeenCalledTimes(1)
    expect(apiClient.post).toHaveBeenCalledWith('/payments/8/verify', {})
  })

  it('si no hay pagos, crea el pago con el comprobante y luego lo verifica', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { data: { id: 55 } } }).mockResolvedValueOnce({ data: {} })
    await verifyTransferPayment(order([]))
    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/payments', { saleId: 40, method: 'transfer', amount: 150000, proofUrl: 'https://x/comprobante.png', reference: 'CUS-1' })
    expect(apiClient.post).toHaveBeenNthCalledWith(2, '/payments/55/verify', {})
  })

  it('si falla, el error sale para que el thunk lo avise', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('sin permiso'))
    await expect(verifyTransferPayment(order([{ id: 1, status: 'review' }]))).rejects.toThrow('sin permiso')
  })
})
