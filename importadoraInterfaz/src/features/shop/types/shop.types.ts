// shop.types · contratos de producto, precios, filtros y carrito
// conecta con: shop.constants, shop.slice y los componentes de shop
export type PriceLevelKey = 'P0' | 'P1' | 'P2' | 'P3'

export interface ProductPrices {
    p0: number // Mostrador / Público general
    p1: number // Taller / Mecánico
    p2: number // Distribuidor / Almacén
    p3: number // Mayorista especial
}

export interface PriceLevelOption {
    key: PriceLevelKey
    label: string
    description: string
    badgeColor?: string
}

export type ProductStockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

export interface Product {
    id: string
    code: string // SKU o Código interno (ej. REP-CIL-100)
    barcode?: string // Código de barras para lector POS
    name: string
    description?: string
    brand: string // Marca (ej. Bajaj, Yamaha, Honda, AKT, Suzuki)
    category: string // Categoría (ej. Motor, Frenos, Transmisión, Eléctrico, Suspensión)
    categoryId?: number
    modelCompatible?: string // Modelo de moto (ej. Boxer CT 100, Pulsar NS 200, FZ 16)
    imageUrl?: string
    brandImage?: string // logo de la marca (dirección de la imagen); sin él se muestra el nombre de la marca
    location?: string // Ubicación física en estantería (ej. Estante M-04): la principal
  locations?: string[] // todas las ubicaciones en la bodega activa (un producto puede estar en varias)
    prices: ProductPrices
    stockByWarehouse: Record<string, number> // Stock mapeado por ID de bodega (ej. '1': 15, '2': 12)
    minStockAlert?: number // Límite para disparar alerta de stock bajo
    isNew?: boolean // Producto creado en los últimos 7 días
    createdAt?: string // Fecha ISO de creación
    status?: 'active' | 'inactive' | 'draft' | 'discontinued'
    iva?: number // porcentaje de IVA (0 = exento); las tarifas de prices son valores netos y el IVA se suma aparte
}

export interface CatalogFilter {
    searchQuery: string
    selectedCategoryId: number | null // id de la categoría del backend (null = todas)
    selectedBrandId: number | null // id de la marca del backend (null = todas)
    onlyInStock: boolean
    priceLevel: PriceLevelKey
}

// un renglón del carrito que viene del backend (GET /carts/active); cartId es el id de ESE RENGLÓN (se usa para cambiar la cantidad o quitarlo), no el del carrito
// ojo: priceLevel puede ser null: el backend guarda solo el precio, no el nivel; el nivel se recuerda aparte (ShopState.cartLevels) y se une al leer
export interface CartItem {
    cartId: number
    stockId?: number // la ubicación de la bodega de la que sale; la API la pide al crear el pedido
    productId: string
    product: Product
    quantity: number
    selectedPrice: number
    priceLevel: PriceLevelKey | null
    subtotal: number
}

// cliente al que se le hace la venta (se elige en Terceros > Clientes); null = la venta va a nombre del usuario de la sesión
export interface CartCustomer {
    id: number
    name: string
    priceType?: string // nivel de precio del cliente (P0..P3)
}

// ojo: el carrito ya no vive aquí: sus líneas llegan del backend y están en shop.cart.slice (no se guardan); aquí solo se guarda el uuid y los niveles
// ojo: la lista de productos ya no vive aquí (esta parte sí se guarda en el navegador); está en el slice de productos (shop.products.slice), que se pide al backend y no se guarda
export interface ShopState {
    filters: CatalogFilter
    cartUuid: string // uuid del carrito activo del empleado en la API ('' hasta que se lee por primera vez)
    cartLevels: Record<string, PriceLevelKey> // nivel de precio con que se agregó cada producto (id → nivel)
    cartCustomer: CartCustomer | null // cliente de la venta
    selectedProductId: string | null
    isCartDrawerOpen: boolean
}

// cambio de stock que llega en tiempo real: valor ABSOLUTO del producto en una bodega (así un evento repetido no descuenta dos veces)
export interface StockUpdate {
    productId: string
    warehouseId: string
    stock: number
}

// dónde queda guardado un producto nuevo: la bodega, una ubicación que ya existe en ella y cuántas unidades hay (0 si solo se asigna el estante)
export interface NewProductStock {
  warehouseId: number
  location: string
  quantity: number
}

// lo que se envía al crear un producto
export interface NewProductInput {
  code: string
  name: string
  description?: string
  categoryId: number
  brandId?: number
  modelId?: number
  unit?: string
  lastCost?: number
  prices: ProductPrices
  isNew?: boolean
  iva?: number // 0 = exento; si no se manda, el producto queda exento
  status?: 'active' | 'inactive'
  initialStock?: NewProductStock[]
}
