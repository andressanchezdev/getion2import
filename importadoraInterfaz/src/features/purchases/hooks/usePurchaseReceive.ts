// usePurchaseReceive · formulario de la recepción en bodega: cuánto entra de cada renglón y en qué ubicación queda
// conecta con: PurchaseReceivePanel (lo usa), usePurchaseDetail (la orden), purchases.rules (validación), purchases.thunks (receivePurchaseThunk), locations (ubicaciones activas de la bodega de la orden) y navigation (cierra el panel)
// ojo: cada renglón arranca con lo pendiente completo y una ubicación vacía; la ubicación es obligatoria; solo se envían los renglones con cantidad
import { useMemo, useState } from 'react'
import { useLocations } from '@/features/locations'
import { closeDrawerForm } from '@/features/navigation'
import { toast } from '@/global/helpers/feedback/toast'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { pendingOf, receiveProblem } from '../helpers/purchases.rules'
import { selectPurchasesSaving } from '../selectors/purchases.selectors'
import { receivePurchaseThunk } from '../thunks/purchases.thunks'
import type { ReceiveLineInput } from '../types/purchases.types'
import { usePurchaseDetail } from './usePurchaseDetail'

export const usePurchaseReceive = (purchaseId: number, onDone?: () => void) => {
  const dispatch = useAppDispatch()
  const detail = usePurchaseDetail(purchaseId)
  const saving = useAppSelector(selectPurchasesSaving)
  const locations = useLocations(detail.purchase?.warehouseId ?? 0)
  // lo que el usuario cambió (por renglón); lo que no tocó sale de lo pendiente
  const [edits, setEdits] = useState<Record<number, Partial<ReceiveLineInput>>>({})
  const [error, setError] = useState<string | null>(null)

  const purchase = detail.purchase
  const lines: ReceiveLineInput[] = useMemo(
    () => (purchase?.items ?? []).filter((item) => pendingOf(item) > 0).map((item) => ({ purchaseItemId: item.id, quantity: pendingOf(item), location: '', ...edits[item.id] })),
    [purchase, edits]
  )
  const problem = purchase ? receiveProblem(purchase.items, lines) : 'Cargando la orden…'

  const change = (purchaseItemId: number, patch: Partial<ReceiveLineInput>) => setEdits((prev) => ({ ...prev, [purchaseItemId]: { ...prev[purchaseItemId], ...patch } }))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!purchase || problem || saving) return
    setError(null)
    const result = await dispatch(receivePurchaseThunk({ id: purchase.id, lines }))
    if (receivePurchaseThunk.fulfilled.match(result)) {
      toast.success(`Recepción de ${purchase.serial} registrada`, { description: result.payload.status === 'received' ? 'La orden quedó recibida completa.' : 'Quedan productos por recibir.' })
      onDone?.()
      dispatch(closeDrawerForm())
    } else {
      setError(result.payload ?? 'No se pudo registrar la recepción.')
    }
  }

  return {
    purchase,
    loading: detail.loading,
    failed: detail.failed,
    loadError: detail.error,
    lines,
    change,
    locations: locations.items.filter((location) => location.isActive),
    problem,
    saving,
    error,
    submit,
    cancel: () => dispatch(closeDrawerForm()),
  }
}
