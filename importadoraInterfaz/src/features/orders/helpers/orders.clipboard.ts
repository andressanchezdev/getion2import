// orders.clipboard · copia el número de un pedido al portapapeles y avisa si salió bien o no
// conecta con: OrdersTable (acción «copiar» de la fila) y OrderDrawer (botón «Copiar número»); usa global toast
// ojo: el portapapeles solo existe en páginas seguras (https o localhost); si no está, el aviso lo dice en lugar de afirmar que se copió
import { toast } from '@/global/helpers/toast'

export const copyOrderSerial = async (serial: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(serial)
    toast.success(`Número copiado: ${serial}`)
  } catch {
    toast.error('No se pudo copiar el número del pedido.')
  }
}
