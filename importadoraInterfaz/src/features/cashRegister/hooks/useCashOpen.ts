// useCashOpen · estado y guardado de la apertura del turno: el fondo inicial de cambio (obligatorio)
// conecta con: CashOpenPanel (lo usa), cash.thunks (openCashSessionThunk), navigation (bodega activa y cierra el panel) y toast
// ojo: el fondo es obligatorio y no puede ser negativo; la bodega es la activa
import { useState } from 'react'
import { closeDrawerForm } from '@/features/navigation'
import { selectWarehouses } from '@/features/warehouses'
import { toast } from '@/global/helpers/feedback/toast'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { selectCash } from '../selectors/cash.selectors'
import { openCashSessionThunk } from '../thunks/cash.thunks'

export const useCashOpen = () => {
  const dispatch = useAppDispatch()
  const warehouses = useAppSelector(selectWarehouses)
  const uiWhId = Number(useAppSelector((state) => state.ui.activeWarehouseId)) || 0
  const warehouseId = uiWhId > 0 ? uiWhId : (warehouses.length > 0 ? Number(warehouses[0].id) : 0)
  const uiWhName = useAppSelector((state) => state.ui.activeWarehouseName) ?? ''
  const warehouseName = uiWhName || (warehouses.find((w) => Number(w.id) === warehouseId)?.name ?? '')
  const { saving } = useAppSelector(selectCash)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)

  const valid = amount !== '' && Number(amount) >= 0 && warehouseId > 0

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!valid || saving) return
    setError(null)
    const result = await dispatch(openCashSessionThunk({ warehouseId, openingAmount: Number(amount) }))
    if (openCashSessionThunk.fulfilled.match(result)) {
      toast.success(`Turno de caja abierto en ${warehouseName}`)
      dispatch(closeDrawerForm())
    } else {
      setError(result.payload ?? 'No se pudo abrir el turno de caja.')
    }
  }

  return { warehouseName, amount, setAmount, valid, saving, error, submit, cancel: () => dispatch(closeDrawerForm()) }
}
