// shop.cart.service.test · pruebas de las llamadas del carrito: ruta, método y cuerpo de cada una
// conecta con: shop.cart.service; el cliente HTTP está simulado (no hay red)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api'
import { addCartItem, deleteCart, deleteCartItem, fetchCartItems, reassignCart, updateCartItemQuantity } from './shop.cart.service'

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  apiClient: { post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

const ctx = { companyId: 3, userId: 7 }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchCartItems', () => {
  it('POST /carts con empresa, usuario, vendedor, uuid y bodega, y convierte las líneas', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        success: true,
        data: [{ cartId: 11, productId: 5, quantity: 2, price: 1000, productInformation: { code: 'A-1', description: 'Pieza' } }],
      },
    })
    const items = await fetchCartItems(ctx, { uuid: 'u-1', warehouseId: 4 })
    expect(apiClient.post).toHaveBeenCalledWith('/carts', { companyId: 3, userId: 7, sellerId: 7, uuid: 'u-1', warehouseId: 4 })
    expect(items[0]).toMatchObject({ cartId: 11, productId: '5', quantity: 2, subtotal: 2000 })
    expect(items[0].product).toMatchObject({ code: 'A-1', name: 'Pieza' })
  })

  it('sin bodega no manda warehouseId', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: null } })
    expect(await fetchCartItems(ctx, { uuid: 'u-1' })).toEqual([])
    expect(apiClient.post).toHaveBeenCalledWith('/carts', expect.not.objectContaining({ warehouseId: expect.anything() }))
  })
})

describe('addCartItem', () => {
  it('POST /carts/register con todos los datos de la línea y tipo "sale"', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } })
    await addCartItem(ctx, { uuid: 'u-1', warehouseId: 4, productId: 5, quantity: 3, price: 1500 })
    expect(apiClient.post).toHaveBeenCalledWith('/carts/register', {
      companyId: 3,
      userId: 7,
      sellerId: 7,
      typeCart: 'sale',
      discount: 0,
      uuid: 'u-1',
      warehouseId: 4,
      productId: 5,
      quantity: 3,
      price: 1500,
    })
  })
})

describe('cambios de una línea', () => {
  it('updateCartItemQuantity: PUT /carts/update con { cartId, quantity }', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} })
    await updateCartItemQuantity(11, 6)
    expect(apiClient.put).toHaveBeenCalledWith('/carts/update', { cartId: 11, quantity: 6 })
  })

  it('deleteCartItem: DELETE /carts/delete con el cartId en el cuerpo', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ data: {} })
    await deleteCartItem(11)
    expect(apiClient.delete).toHaveBeenCalledWith('/carts/delete', { data: { cartId: 11 } })
  })

  it('deleteCart: DELETE /carts/deleteall con usuario y uuid en el cuerpo', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ data: {} })
    await deleteCart(ctx, 'u-1')
    expect(apiClient.delete).toHaveBeenCalledWith('/carts/deleteall', { data: { userId: 7, uuid: 'u-1' } })
  })
})

describe('cliente de la venta', () => {
  it('fetchCartItems con cliente: el userId es el cliente y el vendedor sigue siendo el usuario de la sesión', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: [] } })
    await fetchCartItems(ctx, { uuid: 'u-1', warehouseId: 4, customerId: 21 })
    expect(apiClient.post).toHaveBeenCalledWith('/carts', { companyId: 3, userId: 21, sellerId: 7, uuid: 'u-1', warehouseId: 4 })
  })

  it('addCartItem con cliente: la línea queda a nombre del cliente y customerId no viaja como campo suelto', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } })
    await addCartItem(ctx, { customerId: 21, uuid: 'u-1', warehouseId: 4, productId: 5, quantity: 1, price: 100 })
    const body = vi.mocked(apiClient.post).mock.calls[0][1] as Record<string, unknown>
    expect(body).toMatchObject({ userId: 21, sellerId: 7 })
    expect(body).not.toHaveProperty('customerId')
  })

  it('deleteCart con cliente borra el carrito de ese cliente', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ data: {} })
    await deleteCart(ctx, 'u-1', 21)
    expect(apiClient.delete).toHaveBeenCalledWith('/carts/deleteall', { data: { userId: 21, uuid: 'u-1' } })
  })

  it('reassignCart: PUT /carts/reassignuser con el usuario anterior, el nuevo y el uuid', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} })
    await reassignCart(7, 21, 'u-1')
    expect(apiClient.put).toHaveBeenCalledWith('/carts/reassignuser', { oldUserId: 7, newUserId: 21, uuid: 'u-1' })
  })
})
