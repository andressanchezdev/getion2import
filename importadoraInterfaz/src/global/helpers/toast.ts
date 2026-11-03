// toast · re-export universal de notificaciones para todos los módulos
import { toast } from './feedback/toast'

export { toast }
export const notify = {
  success: (msg: string) => toast.success(msg),
  error: (msg: string) => toast.error(msg),
  info: (msg: string) => toast.info(msg),
  warning: (msg: string) => toast.warning(msg),
}
export default notify

