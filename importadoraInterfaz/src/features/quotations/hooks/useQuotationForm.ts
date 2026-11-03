// useQuotationForm · estado y acciones del formulario «Nueva cotización»: elegir cliente, agregar productos, ajustar cantidades y precios, y crear
// conecta con: CreateQuotationDrawer y sus piezas; despacha quotations.thunks (nada de HTTP aquí) y usa quotations.draft
// ojo: sin cliente elegido se cotiza al cliente 1 (Consumidor Final / mostrador); el cuerpo del drawer se monta solo al abrir, así que cerrar limpia todo
import { useEffect, useState } from 'react'
import { notify } from '@/global/helpers/toast'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { addProductToDraft, draftTotal, patchDraftItem } from '../helpers/quotations.draft'
import { createQuotationThunk, searchQuotationCustomersThunk, searchQuotationProductsThunk } from '../thunks/quotations.thunks'
import type { QuotationCustomerOption, QuotationItemDraft, QuotationProductOption } from '../types/quotations.types'

const SEARCH_DELAY_MS = 300
const WALK_IN_CUSTOMER_ID = 1

export const useQuotationForm = (onClose: () => void) => {
  const dispatch = useAppDispatch()
  const [customerText, setCustomerText] = useState('')
  const [customerResults, setCustomerResults] = useState<QuotationCustomerOption[]>([])
  const [customer, setCustomer] = useState<QuotationCustomerOption | null>(null)
  const [searchingCustomer, setSearchingCustomer] = useState(false)
  const [productText, setProductText] = useState('')
  const [productResults, setProductResults] = useState<QuotationProductOption[]>([])
  const [searchingProduct, setSearchingProduct] = useState(false)
  const [items, setItems] = useState<QuotationItemDraft[]>([])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const text = customerText.trim()
    if (!text) return
    const timer = setTimeout(async () => {
      setSearchingCustomer(true)
      const result = await dispatch(searchQuotationCustomersThunk(text))
      if (searchQuotationCustomersThunk.fulfilled.match(result)) setCustomerResults(result.payload)
      setSearchingCustomer(false)
    }, SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [dispatch, customerText])

  useEffect(() => {
    const text = productText.trim()
    if (!text) return
    const timer = setTimeout(async () => {
      setSearchingProduct(true)
      const result = await dispatch(searchQuotationProductsThunk(text))
      if (searchQuotationProductsThunk.fulfilled.match(result)) setProductResults(result.payload)
      setSearchingProduct(false)
    }, SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [dispatch, productText])

  const pickCustomer = (option: QuotationCustomerOption) => {
    setCustomer(option)
    setCustomerText('')
  }
  const addProduct = (option: QuotationProductOption) => {
    setItems((prev) => addProductToDraft(prev, option))
    setProductText('')
  }

  const submit = async () => {
    if (items.length === 0) return notify.error('Agrega al menos un producto a la cotización')
    setSubmitting(true)
    const result = await dispatch(
      createQuotationThunk({
        customerId: customer?.id ?? WALK_IN_CUSTOMER_ID,
        notes: notes.trim() || undefined,
        items: items.map(({ productId, quantity, unitPrice }) => ({ productId, quantity, unitPrice })),
      })
    )
    setSubmitting(false)
    if (createQuotationThunk.fulfilled.match(result)) onClose()
  }

  return {
    customer, clearCustomer: () => setCustomer(null), customerText, setCustomerText, searchingCustomer, pickCustomer,
    customerResults: customerText.trim() ? customerResults : [],
    productText, setProductText, searchingProduct, addProduct, productResults: productText.trim() ? productResults : [],
    items, setQuantity: (id: number, quantity: number) => setItems((prev) => patchDraftItem(prev, id, { quantity })),
    setPrice: (id: number, unitPrice: number) => setItems((prev) => patchDraftItem(prev, id, { unitPrice })),
    removeItem: (id: number) => setItems((prev) => prev.filter((it) => it.productId !== id)),
    total: draftTotal(items), notes, setNotes, submitting, submit,
  }
}
