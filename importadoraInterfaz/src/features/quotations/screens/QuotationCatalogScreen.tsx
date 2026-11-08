// QuotationCatalogScreen · Tienda > Cotizar: el mismo catálogo de repuestos, pero lo que se agrega arma una cotización (no el carrito de ventas)
// conecta con: ShopCatalogView (el catálogo, de shop), quotationDraft.slice/selectors (la cotización en armado) y quotationDraft (arma el renglón); el carrito de la cotización lo muestra el panel derecho; la monta MainContent
// ojo: aquí no se vende: las cotizaciones se crean solo desde esta pantalla y se consultan en «Historial cotizaciones»
import React from 'react'
import { ShopCatalogView, type PriceLevelKey, type Product } from '@/features/shop'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { toDraftLine } from '../helpers/quotationDraft'
import { selectDraftQuantities } from '../selectors/quotationDraft.selectors'
import { addDraftLine } from '../slices/quotationDraft.slice'

export const QuotationCatalogScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const quantities = useAppSelector(selectDraftQuantities)

  const handleAdd = (product: Product, quantity: number, priceLevel: PriceLevelKey) => {
    dispatch(addDraftLine(toDraftLine(product, quantity, priceLevel)))
  }

  return (
  <ShopCatalogView quantities={quantities} onAdd={handleAdd} />
  )
}

export default QuotationCatalogScreen
