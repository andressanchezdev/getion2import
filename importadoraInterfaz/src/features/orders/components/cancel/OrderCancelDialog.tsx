// OrderCancelDialog · diálogo para anular un pedido: pide el motivo (mínimo 5 letras) y confirma
// conecta con: global ConfirmDialog (el diálogo), orders.thunks (cancelOrderThunk); lo usan OrdersScreen (desde la fila) y OrderDetail (desde el panel)
// ojo: si la anulación falla, el aviso ya salió y el diálogo queda abierto para reintentar; al terminar bien se cierra
import React, { useState } from 'react'
import { ConfirmDialog } from '@/global/components/UI/molecules/ConfirmDialog'
import { useAppDispatch } from '@/global/hooks/useRedux'
import { MIN_CANCEL_REASON } from '../../constants/orders.constants'
import { cancelOrderThunk } from '../../thunks/orders.thunks'
import './OrderCancelDialog.css'

interface OrderCancelDialogProps {
  order: { id: number; serial: string } | null
  onClose: () => void
}

export const OrderCancelDialog: React.FC<OrderCancelDialogProps> = ({ order, onClose }) => {
  const dispatch = useAppDispatch()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const close = () => {
    if (busy) return
    setReason('')
    onClose()
  }

  const confirm = async () => {
    if (!order) return
    setBusy(true)
    const result = await dispatch(cancelOrderThunk({ saleId: order.id, reason }))
    setBusy(false)
    if (cancelOrderThunk.fulfilled.match(result)) {
      setReason('')
      onClose()
    }
  }

  return (
    <ConfirmDialog
      open={order !== null}
      title="¿Anular este pedido?"
      message={`Se anulará el pedido ${order?.serial ?? ''} y el backend devolverá el stock si aplica. Esta acción no se puede deshacer.`}
      confirmLabel={busy ? 'Anulando…' : 'Anular pedido'}
      confirmDisabled={busy || reason.trim().length < MIN_CANCEL_REASON}
      onConfirm={confirm}
      onCancel={close}
    >
      <textarea
        className="order-cancel-reason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder={`Motivo de la anulación (mínimo ${MIN_CANCEL_REASON} letras)`}
        aria-label="Motivo de la anulación"
        maxLength={200}
        rows={3}
      />
    </ConfirmDialog>
  )
}

export default OrderCancelDialog
