// sales.cancel · reglas para anular una venta desde el historial
// conecta con: SalesHistoryScreen (botón y motivo); el estado viene de invoiceStatus (PUT /sales/status: verification, picking, dispatch, facturar, completed, cancelled)
// ojo: una venta ya anulada o completada no se ofrece para anular; los demás estados sí. El backend tiene la última palabra y puede rechazarla
export const MIN_CANCEL_REASON = 5

const CLOSED_STATUSES = ['cancelled', 'completed']

export const canCancelSale = (status: string): boolean => !CLOSED_STATUSES.includes(status.trim().toLowerCase())
