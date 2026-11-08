// usePurchasePay · formulario del pago de una recepción desde la caja: cuánto se paga en efectivo y el número del recibo del proveedor
// conecta con: PurchasePayPanel (lo usa), usePurchaseDetail (la orden), purchases.rules (pendiente y validación), purchases.thunks (payPurchaseThunk) y navigation (cierra el panel)
// ojo: arranca con todo lo pendiente; la caja solo paga en efectivo, desde su turno abierto, y el gasto entra a Facturas cuando la caja cierra
import { useState } from 'react'
import { closeDrawerForm } from '@/features/navigation'
import { toast } from '@/global/helpers/feedback/toast'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { payProblem, pendingToPay } from '../helpers/purchases.rules'
import { selectPurchasesSaving } from '../selectors/purchases.selectors'
import { payPurchaseThunk } from '../thunks/purchases.thunks'
import { usePurchaseDetail } from './usePurchaseDetail'

export const usePurchasePay = (purchaseId: number, onDone?: () => void) => {
  const dispatch = useAppDispatch()
  const detail = usePurchaseDetail(purchaseId)
  const saving = useAppSelector(selectPurchasesSaving)
  const [amount, setAmount] = useState<string | null>(null) // null = todavía no escribió: se ofrece lo pendiente
  const [receipt, setReceipt] = useState('')
  const [error, setError] = useState<string | null>(null)

  const purchase = detail.purchase
  const pending = purchase ? pendingToPay(purchase) : 0
  const value = amount === null ? pending : Number(amount) || 0
  const problem = purchase ? payProblem(value, pending) : 'Cargando la orden…'

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!purchase || problem || saving) return
    setError(null)
    const result = await dispatch(payPurchaseThunk({ id: purchase.id, input: { cashAmount: value, ...(receipt.trim() ? { receiptNumber: receipt.trim() } : {}) } }))
    if (payPurchaseThunk.fulfilled.match(result)) {
      toast.success(`Pago de ${purchase.serial} registrado en la caja`)
      onDone?.()
      dispatch(closeDrawerForm())
    } else {
      setError(result.payload ?? 'No se pudo registrar el pago.')
    }
  }

  return { purchase, pending, amount: amount ?? String(pending || ''), setAmount, receipt, setReceipt, problem, saving, error, loadError: detail.error, failed: detail.failed, submit, cancel: () => dispatch(closeDrawerForm()) }
}
