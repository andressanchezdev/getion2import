// OrderCancelDialog · pide el motivo para anular un pedido en el panel derecho y la anula al confirmar
// conecta con: ReasonPrompt (features/reasonPrompt), orders.thunks (cancelOrderThunk); lo usan OrdersScreen (desde la fila) y OrderDetail (desde el panel)
// ojo: si la anulación falla el aviso ya salió y se puede intentar de nuevo desde la fila; el nombre se conserva aunque ya no es una ventana flotante
import React from 'react'
import { ReasonPrompt } from '@/features/reasonPrompt'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { MIN_CANCEL_REASON } from '../../constants/orders.constants'
import { cancelOrderThunk } from '../../thunks/orders.thunks'

interface OrderCancelDialogProps {
  order: { id: number; serial: string } | null
  onClose: () => void
}

export const OrderCancelDialog: React.FC<OrderCancelDialogProps> = ({ order, onClose }) => {
  const dispatch = useAppDispatch()

  return (
    <ReasonPrompt
      open={order !== null}
      title="Anular pedido"
      message={`Se anulará el pedido ${order?.serial ?? ''} y el backend devolverá el stock si aplica. Esta acción no se puede deshacer.`}
      confirmLabel="Anular pedido"
      minLength={MIN_CANCEL_REASON}
      maxLength={200}
      placeholder={`Motivo de la anulación (mínimo ${MIN_CANCEL_REASON} letras)`}
      onConfirm={(reason) => {
        if (order) void dispatch(cancelOrderThunk({ saleId: order.id, reason }))
        onClose()
      }}
      onCancel={onClose}
    />
  )
}

export default OrderCancelDialog
