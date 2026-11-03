// shop.sales.service.test · pruebas unitarias de la creación y la anulación de pedidos
// conecta con: shop.sales.service; el cliente HTTP está simulado (no hay red)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api'
import { cancelSale, createSale } from './shop.sales.service'

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  apiClient: { post: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createSale', () => {
  it('POST /sales con la bodega, el cliente, el pago y los renglones; lo que no se manda no viaja', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: { id: 123, serialCode: 'PD-9', total: 50000 } } })
    const sale = await createSale({
      warehouseId: 5,
      customerId: 10,
      cartId: 9,
      paymentMethod: 'cash',
      priceTier: undefined,
      items: [{ stockId: 3, quantity: 2, unitPrice: 25000 }],
    })
    expect(apiClient.post).toHaveBeenCalledWith('/sales', {
      warehouseId: 5,
      customerId: 10,
      cartId: 9,
      paymentMethod: 'cash',
      items: [{ stockId: 3, quantity: 2, unitPrice: 25000 }],
    })
    expect(sale).toMatchObject({ id: 123, serialCode: 'PD-9' })
  })

  it('una venta a crédito manda la condición de pago', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: { id: 1, serialCode: 'PD-1', total: 10 } } })
    await createSale({ warehouseId: 5, customerId: 10, paymentMethod: 'credit', paymentCondition: 'credit', items: [{ stockId: 3, quantity: 1, unitPrice: 10 }] })
    expect(apiClient.post).toHaveBeenCalledWith('/sales', expect.objectContaining({ paymentMethod: 'credit', paymentCondition: 'credit' }))
  })
})

describe('cancelSale', () => {
  it('POST /sales/:id/cancel con el motivo recortado', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } })
    await cancelSale({ companyId: 1, userId: 99 }, { saleId: 123, reason: '  Cliente canceló el pedido en mostrador  ' })
    expect(apiClient.post).toHaveBeenCalledWith('/sales/123/cancel', { reason: 'Cliente canceló el pedido en mostrador' })
  })
})
