// shop.selectors · lecturas derivadas del estado de la tienda (filtrado, cantidades y totales del carrito)
// conecta con: ShopCatalogScreen y ShopCartDrawer; leen state.shop (filtros, niveles) y state.cart (líneas del carrito del backend); la lista de productos se lee en shop.products.selectors
// ojo: antes estos cálculos estaban dentro de las pantallas con useMemo; con createSelector se memorizan igual
import { createSelector } from '@reduxjs/toolkit'
import type { CartState } from '../types/shop.cart.api.types'
import type { ShopState } from '../types/shop.types'

// forma mínima del state que necesitan estos selectors (así la feature no importa el store de app)
type ShopRootState = { shop: ShopState; cart: CartState }

const selectShop = (state: ShopRootState) => state.shop
const selectCartState = (state: ShopRootState) => state.cart
export const selectCartCustomer = (state: ShopRootState) => state.shop.cartCustomer
export const selectCartMutating = (state: ShopRootState) => state.cart.mutating
export const selectCartStatus = (state: ShopRootState) => state.cart.status

// líneas del carrito (del backend) con el nivel de precio con que se agregó cada una (si se sabe)
export const selectCartItems = createSelector([selectCartState, selectShop], (cart, shop) =>
  cart.items.map((item) => ({ ...item, priceLevel: shop.cartLevels[item.productId] ?? item.priceLevel }))
)

// Cantidad de cada producto en el carrito (para sincronizar con ProductCard)
export const selectCartQuantities = createSelector([selectCartState], (cart) => {
  const map: Record<string, number> = {}
  cart.items.forEach((item) => {
    map[item.productId] = (map[item.productId] || 0) + item.quantity
  })
  return map
})

// ojo: selectFilteredProducts se movió a shop.products.selectors (selectVisibleProducts): los filtros ahora los aplica el backend y la lista vive en otro slice

// true si hay algún filtro aplicado (para mostrar "Limpiar filtros")
export const selectHasActiveFilters = createSelector([selectShop], ({ filters }) => {
  return (
    Boolean(filters.searchQuery.trim()) ||
    filters.selectedCategoryId !== null ||
    filters.selectedBrandId !== null ||
    filters.onlyInStock
  )
})

// totales del carrito: valor a facturar y cantidad de artículos
export const selectCartTotals = createSelector([selectCartState], (cart) => ({
  totalAmount: cart.items.reduce((acc, item) => acc + item.subtotal, 0),
  totalItemsCount: cart.items.reduce((acc, item) => acc + item.quantity, 0),
}))

// datos del encabezado del panel derecho cuando muestra el carrito (título y cantidad de artículos)
// ojo: antes este encabezado vivía dentro de ShopCartDrawer; ahora lo pinta el panel con estos datos
export const selectCartDrawerMeta = createSelector([selectCartTotals], ({ totalItemsCount }) => ({
  title: 'Carrito',
  badge: `${totalItemsCount} ${totalItemsCount === 1 ? 'artículo' : 'artículos'}`,
}))
