// useBankUpload · subir el PDF del banco y avisar qué se leyó
// conecta con: BankUploadCard (lo usa), bank.thunks (subir), bank.selectors (estado de la subida) y toast
// ojo: solo se acepta PDF; el aviso dice cuántos movimientos se leyeron y cuántos eran nuevos
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { toast } from '@/global/helpers/feedback/toast'
import { selectBankUpload } from '../selectors/bank.selectors'
import { clearBankUploadResult } from '../slices/bank.slice'
import { uploadBankStatementThunk } from '../thunks/bank.thunks'

export const useBankUpload = () => {
  const dispatch = useAppDispatch()
  const upload = useAppSelector(selectBankUpload)

  // sube el archivo elegido si es un PDF y avisa el resultado
  const send = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('El extracto debe ser un archivo PDF.')
      return
    }
    try {
      const result = await dispatch(uploadBankStatementThunk(file)).unwrap()
      toast.success(result.inserted > 0 ? `Se cargaron ${result.inserted} movimientos nuevos` : 'No había movimientos nuevos en ese PDF')
    } catch (message) {
      toast.error(typeof message === 'string' ? message : 'No se pudo leer el PDF del banco.')
    }
  }

  return { ...upload, send, dismiss: () => dispatch(clearBankUploadResult()) }
}
