// useBankActions · confirmar o ignorar un movimiento del banco con su aviso de éxito o error
// conecta con: BankConfirmPanel y BankRecordsTable (lo usan), bank.thunks y toast
// ojo: cada acción devuelve true si salió bien (para cerrar el panel) y false si falló (el error ya se avisó)
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { toast } from '@/global/helpers/feedback/toast'
import { selectBankSaving } from '../selectors/bank.selectors'
import { confirmBankRecordThunk, ignoreBankRecordThunk } from '../thunks/bank.thunks'

export const useBankActions = () => {
  const dispatch = useAppDispatch()
  const saving = useAppSelector(selectBankSaving)

  // corre una acción, avisa el resultado y devuelve si salió bien
  const run = async (action: () => Promise<unknown>, success: string): Promise<boolean> => {
    try {
      await action()
      toast.success(success)
      return true
    } catch (message) {
      toast.error(typeof message === 'string' ? message : 'No se pudo completar la acción.')
      return false
    }
  }

  const confirm = (recordId: number, paymentId?: number, notes?: string) =>
    run(() => dispatch(confirmBankRecordThunk({ recordId, paymentId, notes })).unwrap(), paymentId ? 'Movimiento confirmado y pago verificado' : 'Movimiento confirmado')
  const ignore = (recordId: number, notes?: string) => run(() => dispatch(ignoreBankRecordThunk({ recordId, notes })).unwrap(), 'Movimiento ignorado')

  return { saving, confirm, ignore }
}
