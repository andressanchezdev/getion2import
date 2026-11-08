// ShopCatalogScreen · catálogo de repuestos para vender: el catálogo (ShopCatalogView) con el carrito de compras como destino de «Ordenar»
// conecta con: ShopCatalogView (la presentación), shop.cart.thunks (agregar al carrito), shop.selectors (cantidades del carrito) y shop.slice (abrir el carrito); la monta MainContent
// atajo de teclado: Ctrl + Shift abre el carrito de compras
import React, { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { ShopCatalogView } from '../components/catalog/ShopCatalogView'
import { setCartDrawerOpen } from '../slices/shop.slice'
import { addToCartThunk } from '../thunks/shop.cart.thunks'
import { selectCartQuantities } from '../selectors/shop.selectors'
import type { PriceLevelKey, Product } from '../types/shop.types'

export const ShopCatalogScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  // cantidad de cada producto en el carrito (para sincronizar con ProductCard)
  const cartQuantities = useAppSelector(selectCartQuantities)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey) {
        e.preventDefault()
        dispatch(setCartDrawerOpen(true))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dispatch])

  const handleAddToCart = (product: Product, quantity: number, priceLevel: PriceLevelKey) => {
    dispatch(addToCartThunk({ product, quantity, priceLevel }))
  }

  return <ShopCatalogView quantities={cartQuantities} onAdd={handleAddToCart} />
}

export default ShopCatalogScreen
