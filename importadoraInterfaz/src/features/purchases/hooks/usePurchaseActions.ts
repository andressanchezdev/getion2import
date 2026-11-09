// usePurchaseActions · anular una orden de compra y bajar su Excel, con su aviso de éxito o error
// conecta con: PurchasesTable y PurchaseDetailPanel (lo usan), purchases.thunks (voidPurchaseThunk y exportPurchaseExcelThunk) y toast
// ojo: cada acción devuelve true si salió bien y false si falló (el error ya se avisó)
import { toast } from '@/global/helpers/feedback/toast'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { selectPurchasesSaving } from '../selectors/purchases.selectors'
import { exportPurchaseExcelThunk, voidPurchaseThunk } from '../thunks/purchases.thunks'
import type { Purchase } from '../types/purchases.types'

export const usePurchaseActions = () => {
  const dispatch = useAppDispatch()
  const saving = useAppSelector(selectPurchasesSaving)

  const voidOrder = async (purchase: Pick<Purchase, 'id' | 'serial'>, reason: string): Promise<boolean> => {
    const result = await dispatch(voidPurchaseThunk({ id: purchase.id, reason }))
    if (voidPurchaseThunk.fulfilled.match(result)) {
      toast.success(`Orden ${purchase.serial} anulada`)
      return true
    }
    toast.error(result.payload ?? 'No se pudo anular la orden de compra.')
    return false
  }

  const exportExcel = async (purchase: Pick<Purchase, 'id' | 'serial'>): Promise<boolean> => {
    const result = await dispatch(exportPurchaseExcelThunk({ id: purchase.id, serial: purchase.serial }))
    if (exportPurchaseExcelThunk.fulfilled.match(result)) {
      toast.success('Excel de la orden listo', { description: result.payload })
      return true
    }
    toast.error(result.payload ?? 'No se pudo bajar el Excel de la orden.')
    return false
  }

  return { saving, voidOrder, exportExcel }
}
