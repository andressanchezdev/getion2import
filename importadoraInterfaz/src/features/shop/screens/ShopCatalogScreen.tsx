// ShopCatalogScreen · catálogo de repuestos para vender: el catálogo (ShopCatalogView) con el carrito de compras como destino de «Ordenar»
// conecta con: ShopCatalogView (la presentación), shop.cart.thunks (agregar al carrito) y shop.selectors (cantidades del carrito); la monta MainContent
// atajo de teclado: Alt + C abre y cierra el carrito de compras (gestionado centralmente en DrawerRight)
import React from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { ShopCatalogView } from '../components/catalog/ShopCatalogView'
import { addToCartThunk } from '../thunks/shop.cart.thunks'
import { selectCartQuantities } from '../selectors/shop.selectors'
import type { PriceLevelKey, Product } from '../types/shop.types'

export const ShopCatalogScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  // cantidad de cada producto en el carrito (para sincronizar con ProductCard)
  const cartQuantities = useAppSelector(selectCartQuantities)

  const handleAddToCart = (product: Product, quantity: number, priceLevel: PriceLevelKey) => {
    dispatch(addToCartThunk({ product, quantity, priceLevel }))
  }

  return <ShopCatalogView quantities={cartQuantities} onAdd={handleAddToCart} />
}

export default ShopCatalogScreen
