// shop.sales.service.test · pruebas unitarias de los endpoints de registro y cancelación de ventas
// conecta con: shop.sales.service, apiClient y vitest
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createSale, cancelSale } from './shop.sales.service'
import { apiClient } from '@/api'
import type { RequestContext } from '@/features/auth'

vi.mock('@/api', async () => {
  const actual = await vi.importActual<any>('@/api')
  return {
    ...actual,
    apiClient: {
      post: vi.fn(),
    },
  }
})

describe('shop.sales.service', () => {
  const mockCtx: RequestContext = {
    companyId: 1,
    userId: 99,
    warehouseId: 5,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('createSale inyecta los IDs de auditoría (companyId, sellerId, warehouseId, userId)', async () => {
    const mockRes = { data: { success: true, data: { saleId: 123, total: 50000 } } }
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockRes as any)

    const res = await createSale(mockCtx, {
      uuid: 'uuid-1234',
      customerId: 10,
      paymentMethod: 'cash',
      totalAmount: 50000,
      invoiceStatus: 'pendiente',
    })

    expect(apiClient.post).toHaveBeenCalledWith('/sales/register', {
      companyId: 1,
      userId: 10,
      sellerId: 99,
      warehouseId: 5,
      uuid: 'uuid-1234',
      saleType: 'sale',
      paymentMethod: 'cash',
      totalAmount: 50000,
      invoiceStatus: 'pendiente',
    })
    expect(res.saleId).toBe(123)
  })

  it('cancelSale inyecta userId del empleado autorizador y motivo recortado', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true } } as any)

    await cancelSale(mockCtx, {
      saleId: 123,
      reason: '  Cliente canceló el pedido en mostrador  ',
    })

    expect(apiClient.post).toHaveBeenCalledWith('/sales/cancel', {
      saleId: 123,
      userId: 99,
      reason: 'Cliente canceló el pedido en mostrador',
    })
  })
})
