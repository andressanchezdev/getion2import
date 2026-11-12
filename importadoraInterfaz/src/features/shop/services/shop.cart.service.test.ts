// shop.cart.service.test · pruebas de las llamadas del carrito: ruta, método y cuerpo de cada una
// conecta con: shop.cart.service; el cliente HTTP está simulado (no hay red)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api'
import { addCartItem, clearCart, deleteCartItem, fetchActiveCart, updateCartItemQuantity } from './shop.cart.service'
import type { Product } from '../types/shop.types'

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchActiveCart', () => {
  it('GET /carts/active y convierte el carrito: id, uuid y renglones', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 9,
          uuid: 'u-9',
          items: [{ id: 11, cartId: 9, productId: 5, productCode: 'A-1', productName: 'Pieza', stockId: 3, quantity: 2, unitPrice: 1000, lineTotal: 2000 }],
        },
      },
    })
    const cart = await fetchActiveCart()
    expect(apiClient.get).toHaveBeenCalledWith('/carts/active')
    expect(cart).toMatchObject({ cartId: 9, uuid: 'u-9' })
    expect(cart.items[0]).toMatchObject({ cartId: 11, productId: '5', quantity: 2, selectedPrice: 1000, subtotal: 2000 })
    expect(cart.items[0].product).toMatchObject({ code: 'A-1', name: 'Pieza' })
  })

  it('un carrito sin renglones queda vacío', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: { id: 9, uuid: 'u-9', items: null } } })
    expect((await fetchActiveCart()).items).toEqual([])
  })

  it('los productos conocidos conservan su marca e imagen', async () => {
    const known: Product = { id: '5', code: 'A-1', name: 'Pieza', brand: 'Bajaj', category: 'Motor', imageUrl: 'https://x/p.png', prices: { p0: 1, p1: 1, p2: 1, p3: 1 }, stockByWarehouse: {} }
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, data: { id: 9, uuid: 'u', items: [{ id: 1, cartId: 9, productId: 5, productCode: 'A-1', productName: 'Pieza', stockId: 3, quantity: 1, unitPrice: 10, lineTotal: 10 }] } },
    })
    expect((await fetchActiveCart({ '5': known })).items[0].product).toBe(known)
  })
})

describe('cambios del carrito', () => {
  it('addCartItem: POST /carts/:id/items con { stockId, quantity, unitPrice } o { productId, warehouseId, quantity, unitPrice }', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } })
    await addCartItem({ cartId: 9, stockId: 3, quantity: 3, price: 1500 })
    expect(apiClient.post).toHaveBeenCalledWith('/carts/9/items', { stockId: 3, quantity: 3, unitPrice: 1500 })

    await addCartItem({ cartId: 9, productId: 5, warehouseId: 4, quantity: 2, price: 900 })
    expect(apiClient.post).toHaveBeenLastCalledWith('/carts/9/items', { productId: 5, warehouseId: 4, quantity: 2, unitPrice: 900 })
  })

  it('updateCartItemQuantity: PUT /carts/:id/items/:itemId con { quantity }', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} })
    await updateCartItemQuantity(9, 11, 6)
    expect(apiClient.put).toHaveBeenCalledWith('/carts/9/items/11', { quantity: 6 })
  })

  it('deleteCartItem: DELETE /carts/:id/items/:itemId', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ data: {} })
    await deleteCartItem(9, 11)
    expect(apiClient.delete).toHaveBeenCalledWith('/carts/9/items/11')
  })

  it('clearCart: DELETE /carts/:id', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ data: {} })
    await clearCart(9)
    expect(apiClient.delete).toHaveBeenCalledWith('/carts/9')
  })
})
