// toast · punto único para lanzar alertas flotantes desde cualquier feature
// conecta con: AppToaster (las pinta); uso: toast.success('Título', { description: 'detalle' }) o toast.error(...)
import { toast } from 'sonner'

export { toast }
export const notify = {
  success: (msg: string) => toast.success(msg),
  error: (msg: string) => toast.error(msg),
  info: (msg: string) => toast.info(msg),
  warning: (msg: string) => toast.warning(msg),
}
export default notify
