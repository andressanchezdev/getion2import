// shop.adapter.test · pruebas de la conversión de productos del backend (POST /products y /inventory/search) al Product de la app
// conecta con: shop.adapter; se corre con npm test
import { describe, expect, it } from 'vitest'
import { toCartItem, toProduct, toProductFromControl } from './shop.adapter'
import type { ControlProductDto, ProductDto } from '../types/shop.api.types'

const dto: ProductDto = {
  productId: 101,
  code: 'REP-CIL-100',
  description: '  Kit Cilindro Boxer CT 100  ',
  brandName: 'Bajaj',
  categoryName: 'Motor',
  modelName: 'Boxer CT 100',
  images: [
    { url: 'https://x/secundaria.png', isMain: false },
    { url: 'https://x/principal.png', isMain: true },
  ],
  prices: [
    { type: 'P0', price: 165000 },
    { type: 'p1', price: 152000 },
    { type: 'P2', price: 140000 },
    { type: 'P3', price: 132000 },
  ],
  locations: [
    { warehouseId: 1, locationCode: 'M-02', stock: 20, reservedStock: 2 },
    { warehouseId: 1, locationCode: 'M-03', stock: 5 },
    { warehouseId: 2, locationCode: 'N-01', stock: 6, reservedStock: 6 },
  ],
}

describe('toProduct', () => {
  it('convierte los datos básicos', () => {
    const product = toProduct(dto, 1)
    expect(product).toMatchObject({
      id: '101',
      code: 'REP-CIL-100',
      name: 'Kit Cilindro Boxer CT 100',
      brand: 'Bajaj',
      category: 'Motor',
      modelCompatible: 'Boxer CT 100',
    })
  })

  it('elige la imagen principal', () => {
    expect(toProduct(dto).imageUrl).toBe('https://x/principal.png')
  })

  it('extrae imagen cuando images es un arreglo de strings', () => {
    expect(toProduct({ ...dto, images: ['https://x/string-url.png'] }).imageUrl).toBe('https://x/string-url.png')
  })

  it('extrae imagen de productImage si images está vacío', () => {
    expect(toProduct({ ...dto, images: [], productImage: 'https://x/from-product-image.png' }).imageUrl).toBe(
      'https://x/from-product-image.png'
    )
  })

  it('sin imágenes válidas queda sin imagen', () => {
    expect(toProduct({ ...dto, images: null }).imageUrl).toBeUndefined()
    expect(toProduct({ ...dto, images: ['   ', 'null'] }).imageUrl).toBeUndefined()
  })

  it('resuelve rutas relativas con el bucket de Google Cloud Storage', () => {
    expect(toProduct({ ...dto, images: [{ url: 'productos/cilindro.jpg' }] }).imageUrl).toBe(
      'https://storage.googleapis.com/importadorapremiumonline/productos/cilindro.jpg'
    )
    expect(toProduct({ ...dto, brandImage: 'marcas/bajaj.png' }).brandImage).toBe(
      'https://storage.googleapis.com/importadorapremiumonline/marcas/bajaj.png'
    )
  })

  it('calcula isNew si la fecha de creación fue en los últimos 7 días', () => {
    const recent = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
    expect(toProduct({ ...dto, created_at: recent }).isNew).toBe(true)

    const old = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
    expect(toProduct({ ...dto, created_at: old }).isNew).toBe(false)
  })

  it('arma los 4 precios por tipo, sin importar mayúsculas', () => {
    expect(toProduct(dto).prices).toEqual({ p0: 165000, p1: 152000, p2: 140000, p3: 132000 })
  })

  it('los precios que faltan quedan en 0', () => {
    expect(toProduct({ ...dto, prices: [{ type: 'P0', price: 10 }] }).prices).toEqual({ p0: 10, p1: 0, p2: 0, p3: 0 })
    expect(toProduct({ ...dto, prices: null }).prices.p0).toBe(0)
  })

  it('el stock de cada bodega suma sus ubicaciones y descuenta lo reservado', () => {
    expect(toProduct(dto).stockByWarehouse).toEqual({ '1': 23, '2': 0 })
  })

  it('la ubicación es la de la bodega pedida, o la primera si no hay', () => {
    expect(toProduct(dto, 2).location).toBe('N-01')
    expect(toProduct(dto, 99).location).toBe('M-02')
  })

  it('sin descripción el nombre es el código', () => {
    expect(toProduct({ ...dto, description: '' }).name).toBe('REP-CIL-100')
  })

  it('si no hay modelo usa la lista de modelos', () => {
    expect(toProduct({ ...dto, modelName: '', models: ['A', 'B'] }).modelCompatible).toBe('A / B')
  })

  it('sin ubicaciones el stock queda vacío', () => {
    expect(toProduct({ ...dto, locations: null }).stockByWarehouse).toEqual({})
  })
})

describe('toProductFromControl', () => {
  const control: ControlProductDto = {
    productId: 7,
    code: 'FRE-200',
    productInformation: {
      description: 'Pastillas de freno',
      brandName: 'Yamaha',
      categoryName: 'Frenos',
      modelName: 'FZ 16',
      productImage: 'https://x/p.png',
    },
    prices: [{ price: 100 }, { price: 90 }, { price: 80 }],
    locations: [
      { warehouseId: 3, locationCode: 'F-01', physicalStock: 9 },
      { warehouseId: 3, physicalStock: 1 },
    ],
  }

  it('convierte la información del producto', () => {
    expect(toProductFromControl(control, 3)).toMatchObject({
      id: '7',
      code: 'FRE-200',
      name: 'Pastillas de freno',
      brand: 'Yamaha',
      category: 'Frenos',
      modelCompatible: 'FZ 16',
      imageUrl: 'https://x/p.png',
      location: 'F-01',
    })
  })

  it('asigna los precios por orden (P0, P1, P2...)', () => {
    expect(toProductFromControl(control).prices).toEqual({ p0: 100, p1: 90, p2: 80, p3: 0 })
  })

  it('suma el stock físico por bodega', () => {
    expect(toProductFromControl(control).stockByWarehouse).toEqual({ '3': 10 })
  })

  it('sin información ni listas no se rompe', () => {
    const product = toProductFromControl({ productId: 1, code: 'X' })
    expect(product.name).toBe('X')
    expect(product.prices).toEqual({ p0: 0, p1: 0, p2: 0, p3: 0 })
    expect(product.stockByWarehouse).toEqual({})
  })
})

describe('toCartItem', () => {
  it('convierte una línea del carrito con su producto, precio y subtotal', () => {
    const item = toCartItem({
      cartId: 11,
      productId: 5,
      quantity: 3,
      price: 1500,
      productInformation: { code: 'A-1', description: ' Pieza ', brandName: 'Bajaj', categoryName: 'Motor', modelName: 'Boxer', url: 'https://x/p.png' },
    })
    expect(item).toMatchObject({ cartId: 11, productId: '5', quantity: 3, selectedPrice: 1500, subtotal: 4500, priceLevel: null })
    expect(item.product).toMatchObject({ id: '5', code: 'A-1', name: 'Pieza', brand: 'Bajaj', category: 'Motor', modelCompatible: 'Boxer', imageUrl: 'https://x/p.png' })
  })

  it('sin productInformation no se rompe (el nombre queda vacío)', () => {
    const item = toCartItem({ cartId: 1, productId: 2, quantity: 1, price: 10 })
    expect(item.product.name).toBe('')
    expect(item.product.stockByWarehouse).toEqual({})
  })
})
