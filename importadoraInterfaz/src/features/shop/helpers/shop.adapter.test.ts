// shop.adapter.test · pruebas de la conversión de productos de la API en Go (GET /products y /products/search + GET /stock) al Product de la app
// conecta con: shop.adapter; se corre con npm test
import { describe, expect, it } from 'vitest'
import { indexStock, toCartItem, toCartSnapshot, toProduct, toProductPrices } from './shop.adapter'
import type { ProductDto, StockRowDto } from '../types/shop.api.types'

const dto: ProductDto = {
  id: 101,
  code: 'REP-CIL-100',
  name: '  Kit Cilindro Boxer CT 100  ',
  description: 'Kit completo',
  brandName: 'Bajaj',
  categoryName: 'Motor',
  modelName: 'Boxer CT 100',
  images: ['https://x/principal.png', 'https://x/secundaria.png'],
  prices: { p1: 165000, p2: 152000, p3: 140000, p4: 132000 },
  status: 'active',
}

describe('toProductPrices', () => {
  it('p1..p4 de la API son P0..P3 de la app', () => {
    expect(toProductPrices({ p1: 10, p2: 20, p3: 30, p4: 40 })).toEqual({ p0: 10, p1: 20, p2: 30, p3: 40 })
  })

  it('lo que falta o no es número queda en 0', () => {
    expect(toProductPrices({ p1: 5 })).toEqual({ p0: 5, p1: 0, p2: 0, p3: 0 })
    expect(toProductPrices(null)).toEqual({ p0: 0, p1: 0, p2: 0, p3: 0 })
  })
})

describe('toProduct', () => {
  it('convierte los datos básicos y toma la primera imagen como principal', () => {
    const product = toProduct(dto)
    expect(product).toMatchObject({
      id: '101',
      code: 'REP-CIL-100',
      name: 'Kit Cilindro Boxer CT 100',
      description: 'Kit completo',
      brand: 'Bajaj',
      category: 'Motor',
      modelCompatible: 'Boxer CT 100',
      imageUrl: 'https://x/principal.png',
    })
    expect(product.prices.p0).toBe(165000)
  })

  it('sin name usa la descripción y, al final, el código', () => {
    expect(toProduct({ id: 1, code: 'A', description: ' Pieza A ' }).name).toBe('Pieza A')
    expect(toProduct({ id: 2, code: 'B' }).name).toBe('B')
  })

  it('sin imágenes válidas queda sin imagen', () => {
    expect(toProduct({ ...dto, images: [] }).imageUrl).toBeUndefined()
    expect(toProduct({ ...dto, images: ['  '] }).imageUrl).toBeUndefined()
    expect(toProduct({ ...dto, images: null }).imageUrl).toBeUndefined()
  })

  it('resuelve rutas relativas con el bucket de Google Cloud Storage', () => {
    expect(toProduct({ ...dto, images: ['productos/a.png'] }).imageUrl).toMatch(/^https:\/\/.+productos\/a\.png$/)
  })

  it('toma isNew del dto', () => {
    expect(toProduct({ ...dto, isNew: true }).isNew).toBe(true)
    expect(toProduct({ ...dto, isNew: false }).isNew).toBe(false)
    expect(toProduct(dto).isNew).toBe(false)
  })

  it('el stock queda en la bodega elegida y la ubicación sale del stock', () => {
    const product = toProduct(dto, 2, { sellable: 9, location: 'A-700' })
    expect(product.stockByWarehouse).toEqual({ '2': 9 })
    expect(product.location).toBe('A-700')
  })

  it('sin bodega o sin stock el stock queda vacío', () => {
    expect(toProduct(dto, undefined, { sellable: 9 }).stockByWarehouse).toEqual({})
    expect(toProduct(dto, 2).stockByWarehouse).toEqual({})
  })
})

describe('indexStock', () => {
  const row = (over: Partial<StockRowDto>): StockRowDto => ({ stockId: 1, warehouseId: 1, productId: 10, location: 'A-1', available: 5, reserved: 0, sellable: 5, ...over })

  it('suma lo vendible de las ubicaciones de un producto en la bodega pedida', () => {
    const map = indexStock([row({ sellable: 5 }), row({ stockId: 2, location: 'B-2', sellable: 8 })], 1)
    expect(map.get(10)).toMatchObject({ sellable: 13, location: 'B-2' })
  })

  it('un producto puede estar en varias ubicaciones de la bodega: se guardan todas, la de más vendible primero', () => {
    const map = indexStock([row({ stockId: 1, location: 'A-1', sellable: 5 }), row({ stockId: 2, location: 'B-2', sellable: 8 }), row({ stockId: 3, location: 'C-3', sellable: 0 })], 1)
    expect(map.get(10)?.locations).toEqual(['B-2', 'A-1', 'C-3'])
  })

  it('la alerta de stock bajo es la más alta de las ubicaciones de la bodega', () => {
    const map = indexStock([row({ sellable: 5, location: 'A', minStock: 3 }), row({ sellable: 8, location: 'B', minStock: 5 })], 1)
    expect(map.get(10)?.minStock).toBe(5)
  })

  it('el producto lleva la alerta de la bodega para pintar «bajo stock» o «agotado»', () => {
    expect(toProduct(dto, 2, { sellable: 4, minStock: 5 }).minStockAlert).toBe(5)
    expect(toProduct(dto, 2, { sellable: 4 }).minStockAlert).toBeUndefined()
  })

  it('ignora las otras bodegas', () => {
    expect(indexStock([row({ warehouseId: 2 })], 1).size).toBe(0)
  })

  it('lo vendible nunca baja de 0 y una ubicación vacía no cuenta como ubicación', () => {
    const map = indexStock([row({ sellable: -3, location: '' })], 1)
    expect(map.get(10)).toEqual({ sellable: 0 })
  })
})

describe('toCartItem', () => {
  const dtoLine = { id: 11, cartId: 9, productId: 5, productCode: 'A-1', productName: ' Pieza ', stockId: 3, location: 'A-700', quantity: 3, unitPrice: 1500, lineTotal: 4500 }

  it('convierte un renglón del carrito con su producto, precio y total', () => {
    const item = toCartItem(dtoLine)
    expect(item).toMatchObject({ cartId: 11, productId: '5', quantity: 3, selectedPrice: 1500, subtotal: 4500, priceLevel: null })
    expect(item.product).toMatchObject({ id: '5', code: 'A-1', name: 'Pieza', location: 'A-700', brand: '' })
  })

  it('si el producto ya se conoce usa el completo (con marca e imagen)', () => {
    const known = toProduct(dto)
    expect(toCartItem(dtoLine, known).product).toBe(known)
  })

  it('sin nombre el producto queda con su código', () => {
    expect(toCartItem({ ...dtoLine, productName: '' }).product.name).toBe('A-1')
  })
})

describe('toCartSnapshot', () => {
  it('trae el id, el uuid y los renglones, usando los productos conocidos por id', () => {
    const known = { '5': toProduct(dto) }
    const snap = toCartSnapshot({ id: 9, uuid: 'u-9', items: [{ id: 11, cartId: 9, productId: 5, productCode: 'A', productName: 'A', stockId: 3, quantity: 1, unitPrice: 10, lineTotal: 10 }] }, known)
    expect(snap).toMatchObject({ cartId: 9, uuid: 'u-9' })
    expect(snap.items[0].product).toBe(known['5'])
  })

  it('un carrito sin renglones queda vacío', () => {
    expect(toCartSnapshot({ id: 9, uuid: 'u', items: null }).items).toEqual([])
  })
})

describe('toProduct · imagen del sistema anterior', () => {
  it('sin imagen de la API usa la del bucket anterior por código, con la ruta codificada', () => {
    const product = toProduct({ id: 1, code: '36DD4001-1', name: 'ANILLOS BOXER CT' })
    expect(product.imageUrl).toBe('https://storage.googleapis.com/importadorapremiumonline/dependencias/img/productos/36DD4001-1/1%20(1).jpg')
  })

  it('la imagen que trae la API manda sobre la del bucket anterior', () => {
    const product = toProduct({ id: 1, code: '36DD4001-1', name: 'x', images: ['https://cdn.example.com/a.png'] })
    expect(product.imageUrl).toBe('https://cdn.example.com/a.png')
  })

  it('un código sin imagen en el bucket queda sin imagen', () => {
    expect(toProduct({ id: 2, code: 'SIN-IMAGEN', name: 'x' }).imageUrl).toBeUndefined()
  })
})
