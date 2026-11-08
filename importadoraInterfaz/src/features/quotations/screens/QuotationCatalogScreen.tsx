// QuotationCatalogScreen · Tienda > Cotizar: el mismo catálogo de repuestos, pero lo que se agrega arma una cotización (no el carrito de ventas)
// conecta con: ShopCatalogView (el catálogo, de shop), quotationDraft.slice/selectors (la cotización en armado), quotationDraft (arma el renglón) y navigation (abre el panel de la cotización); la monta MainContent
// ojo: aquí no se vende: las cotizaciones se crean solo desde esta pantalla y se consultan en «Historial cotizaciones»
import React from 'react'
import { openDrawerForm } from '@/features/navigation'
import { ShopCatalogView, type PriceLevelKey, type Product } from '@/features/shop'
import { Icon } from '@/global/components/UI/atoms/Icon'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import receiptIcon from '@/assets/icons/receipt.svg?raw'
import { toDraftLine } from '../helpers/quotationDraft'
import { selectDraftQuantities, selectDraftUnits } from '../selectors/quotationDraft.selectors'
import { addDraftLine } from '../slices/quotationDraft.slice'

export const QuotationCatalogScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const quantities = useAppSelector(selectDraftQuantities)
  const units = useAppSelector(selectDraftUnits)

  const handleAdd = (product: Product, quantity: number, priceLevel: PriceLevelKey) => {
    dispatch(addDraftLine(toDraftLine(product, quantity, priceLevel)))
  }

  return (
    <ShopCatalogView
      quantities={quantities}
      onAdd={handleAdd}
      summaryAction={
        <button type="button" className="btn-secondary" onClick={() => dispatch(openDrawerForm({ kind: 'quotationDraft' }))}>
          <Icon svg={receiptIcon} /> Ver cotización ({units})
        </button>
      }
    />
  )
}

export default QuotationCatalogScreen
