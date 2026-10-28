// useCreditPayment · maneja el abono de un cliente: monto digitado, validación, registro en el backend y mensaje de éxito
// conecta con: CreditAccountDetail (lo usa); wallet.payments.thunks (payThunk), wallet.helpers (parsePaymentAmount), global toast
// ojo: antes el abono se sumaba en el slice; ahora se registra en el backend (POST /payments/register) y los saldos se vuelven a leer. El monto digitado se limpia solo si el abono salió bien
import { useState } from 'react'
import { formatCOP } from '@/global/helpers/format'
import { toast } from '@/global/helpers/toast'
import { useAppDispatch } from '@/global/hooks/useRedux'
import { payThunk } from '../thunks/wallet.payments.thunks'
import { parsePaymentAmount } from '../helpers/wallet.helpers'

export const useCreditPayment = (customerId: number) => {
  const dispatch = useAppDispatch()
  const [paymentAmount, setPaymentAmount] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // registra el abono: de una factura (saleId + fullAmount) o del monto digitado en el formulario (se reparte entre las más antiguas)
  const submitPayment = async (saleId?: number, fullAmount?: number) => {
    const amount = fullAmount ?? parsePaymentAmount(paymentAmount)
    if (!amount) {
      toast.error('Monto inválido', { description: 'Por favor digita un monto válido a abonar.' })
      return
    }
    const result = await dispatch(payThunk({ customerId, amount, saleId }))
    if (payThunk.fulfilled.match(result)) {
      setPaymentAmount('')
      setSuccessMessage(`¡Abono de ${formatCOP(amount)} registrado con éxito!`)
      setTimeout(() => setSuccessMessage(null), 4000)
    }
  }

  return { paymentAmount, setPaymentAmount, successMessage, submitPayment }
}
