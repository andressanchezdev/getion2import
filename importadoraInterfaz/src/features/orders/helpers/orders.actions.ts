// orders.actions · acciones que ofrece cada fila de la tabla de pedidos (ver detalle, copiar el número y anular)
// conecta con: OrderRowActions (arma el menú), OrdersScreen (ejecuta cada acción)
// ojo: aquí solo están las acciones que la API actual permite de forma verificada; las del flujo por etapas (tomar, completar, verificar, pausar, devolver, registrar abono) se suman a esta lista cuando la API en Go las exponga
import type { OrderRow } from '../types/orders.types'

export type OrderActionKey = 'detail' | 'copy' | 'cancel'

export interface OrderAction {
  key: OrderActionKey
  label: string
  danger?: boolean
}

// ver detalle y copiar siempre; anular solo con permiso (el backend tiene la última palabra y puede rechazarlo)
export const getOrderActions = (_order: OrderRow, canCancel: boolean): OrderAction[] => [
  { key: 'detail', label: 'Ver detalle' },
  { key: 'copy', label: 'Copiar número del pedido' },
  ...(canCancel ? [{ key: 'cancel' as const, label: 'Anular con motivo…', danger: true }] : []),
]
