// useCreateReturnForm · estado y acciones del formulario «Nueva devolución»: buscar la venta, elegir renglones y cantidades, causal, resolución y enviar
// conecta con: CreateReturnDrawer y sus piezas; despacha returns.thunks (nada de HTTP aquí) y usa returns.helpers
// ojo: la búsqueda espera 300 ms tras escribir; el cuerpo del drawer se monta solo al abrir, así que cerrar limpia todo
import { useEffect, useState } from 'react'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { notify } from '@/global/helpers/feedback/toast'
import { clampQuantity, initialPicks, picksToItems, type ItemPick } from '../helpers/returns.helpers'
import { createReturnThunk, loadSaleItemsThunk, searchSalesThunk } from '../thunks/returns.thunks'
import type { ReturnReasonType, ReturnResolutionType, SaleOption } from '../types/returns.types'

const SEARCH_DELAY_MS = 300

export const useCreateReturnForm = (onClose: () => void) => {
  const dispatch = useAppDispatch()
  const [search, setSearch] = useState('')
  const [sales, setSales] = useState<SaleOption[]>([])
  const [searching, setSearching] = useState(false)
  const [sale, setSale] = useState<SaleOption | null>(null)
  const [loadingSale, setLoadingSale] = useState(false)
  const [picks, setPicks] = useState<Record<number, ItemPick>>({})
  const [reasonType, setReasonType] = useState<ReturnReasonType>('warranty')
  const [resolutionType, setResolutionType] = useState<ReturnResolutionType>('exchange')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(async () => {
      setSearching(true)
      const result = await dispatch(searchSalesThunk(search.trim()))
      if (searchSalesThunk.fulfilled.match(result)) setSales(result.payload)
      setSearching(false)
    }, SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [dispatch, search])

  const selectSale = async (option: SaleOption) => {
    setLoadingSale(true)
    const full = await dispatch(loadSaleItemsThunk(option)).unwrap()
    setSale(full)
    setPicks(initialPicks(full))
    setLoadingSale(false)
  }

  const togglePick = (itemId: number) => setPicks((prev) => ({ ...prev, [itemId]: { ...prev[itemId], selected: !prev[itemId]?.selected } }))
  const setPickQuantity = (itemId: number, max: number, quantity: number) =>
    setPicks((prev) => ({ ...prev, [itemId]: { ...prev[itemId], quantity: clampQuantity(quantity, max) } }))

  const submit = async () => {
    if (!sale) return notify.error('Selecciona una venta para asociar la devolución')
    if (!reason.trim()) return notify.error('Ingresa el motivo de la devolución o garantía')
    const items = picksToItems(picks)
    if (items.length === 0) return notify.error('Selecciona al menos un producto a devolver')
    setSubmitting(true)
    const result = await dispatch(createReturnThunk({ saleId: sale.id, reason: reason.trim(), reasonType, resolutionType, items }))
    setSubmitting(false)
    if (createReturnThunk.fulfilled.match(result)) onClose()
  }

  return {
    search, setSearch, sales, searching, sale, clearSale: () => setSale(null), loadingSale, selectSale,
    picks, togglePick, setPickQuantity, reasonType, setReasonType, resolutionType, setResolutionType, reason, setReason, submitting, submit,
  }
}
