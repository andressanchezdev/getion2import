// shop.sales.service.test · pruebas de registrar la venta desde el carrito y de anularla
// conecta con: shop.sales.service; el cliente HTTP está simulado (no hay red)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api'
import type { RequestContext } from '@/features/auth'
import { cancelSale, registerSale, toRegisteredSale } from './shop.sales.service'

vi.mock('@/api', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/api')
  return { ...actual, apiClient: { post: vi.fn() } }
})

const ctx: RequestContext = { companyId: 1, userId: 99, warehouseId: 5 }

beforeEach(() => vi.clearAllMocks())

describe('registerSale', () => {
  it('envía solo lo que el Swagger exige más medio de pago y total, a nombre del cliente', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true, data: { saleId: 123, serialCode: 4567 } } })
    const sale = await registerSale(ctx, { uuid: 'u-1', customerId: 10, warehouseId: 4, paymentMethod: 'cash', totalAmount: 50000 })
    expect(apiClient.post).toHaveBeenCalledWith('/sales/register', {
      companyId: 1,
      userId: 10,
      sellerId: 99,
      warehouseId: 4,
      uuid: 'u-1',
      saleType: 'sale',
      paymentMethod: 'cash',
      totalAmount: 50000,
    })
    expect(sale).toEqual({ saleId: 123, serialCode: 4567 })
  })

  it('sin cliente la venta queda a nombre del usuario de la sesión', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true } })
    await registerSale(ctx, { uuid: 'u-2', warehouseId: 4, paymentMethod: 'credit', totalAmount: 1 })
    expect(vi.mocked(apiClient.post).mock.calls[0][1]).toMatchObject({ userId: 99, sellerId: 99 })
  })

  it('no manda invoiceStatus (el Swagger no lo exige y sus valores no están documentados)', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} })
    await registerSale(ctx, { uuid: 'u-3', warehouseId: 4, paymentMethod: 'cash', totalAmount: 1 })
    expect(vi.mocked(apiClient.post).mock.calls[0][1]).not.toHaveProperty('invoiceStatus')
  })
})

describe('toRegisteredSale', () => {
  it('acepta una respuesta vacía o sin números válidos', () => {
    expect(toRegisteredSale(undefined)).toEqual({ saleId: undefined, serialCode: undefined })
    expect(toRegisteredSale({ saleId: 0, serialCode: 'x' })).toEqual({ saleId: undefined, serialCode: undefined })
  })
})

describe('cancelSale', () => {
  it('envía el usuario autorizador y el motivo recortado', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true } })
    await cancelSale(ctx, { saleId: 123, reason: '  Cliente canceló  ' })
    expect(apiClient.post).toHaveBeenCalledWith('/sales/cancel', { saleId: 123, userId: 99, reason: 'Cliente canceló' })
  })
})
