// useCreateAbono · estado y guardado del abono a cartera: buscar un cliente CON crédito, ver sus facturas pendientes, monto, método y comprobante
// conecta con: CreateAbonoPanel (lo usa), useCreditCustomerSearch (búsqueda), wallet.thunks (loadInvoicesThunk), wallet.payments.thunks (payThunk), wallet.selectors y navigation (cierra el panel y la bodega activa)
// ojo: la bodega no se elige: es la del empleado que registra (la activa de la sesión); el efectivo se verifica en seguida y la transferencia queda en revisión hasta conciliarla con el banco; el monto no puede pasar de lo que el cliente debe
import { useMemo, useState } from 'react'
import { closeDrawerForm } from '@/features/navigation'
import { toast } from '@/global/helpers/feedback/toast'
import { optimizeImageFile } from '@/global/helpers/images/imageOptimizer'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { debtOf, pendingInvoices } from '../helpers/wallet.abonos'
import { selectWalletInvoices } from '../selectors/wallet.selectors'
import { payThunk } from '../thunks/wallet.payments.thunks'
import { loadInvoicesThunk } from '../thunks/wallet.thunks'
import type { CreditCustomerOption } from '../types/wallet.types'
import { useCreditCustomerSearch } from './useCreditCustomerSearch'

export interface CreateAbonoPayload {
  onDone?: () => void
}

export const useCreateAbono = (onDone?: () => void) => {
  const dispatch = useAppDispatch()
  const warehouseName = useAppSelector((state) => state.ui.activeWarehouseName)
  const [query, setQuery] = useState('')
  const [customer, setCustomer] = useState<CreditCustomerOption | null>(null)
  const [saleId, setSaleId] = useState('') // '' = repartir entre las facturas más antiguas
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'cash' | 'transfer'>('cash')
  const [reference, setReference] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCreditCustomerSearch(query)
  const invoicesState = useAppSelector(selectWalletInvoices)
  const clients = useMemo(() => search.items.filter((option) => option.isCredit), [search.items])
  const pending = useMemo(() => pendingInvoices(invoicesState.items), [invoicesState.items])
  const debt = debtOf(pending)
  const selectedInvoice = pending.find((invoice) => String(invoice.saleId) === saleId)
  const maxAmount = selectedInvoice ? selectedInvoice.pendingBalance : debt
  const value = Number(amount) || 0

  const choose = (option: CreditCustomerOption | null) => {
    setCustomer(option)
    setSaleId('')
    setAmount('')
    if (option) dispatch(loadInvoicesThunk(option.id))
  }

  const attach = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Adjunta una captura o foto válida (JPG o PNG).')
      return
    }
    setFileName(file.name)
    try {
      setProofUrl((await optimizeImageFile(file, { maxWidth: 1000, maxHeight: 1000, quality: 0.8 })).dataUrl)
    } catch {
      setProofUrl('')
      toast.error('No se pudo leer la imagen.')
    }
  }

  const transferReady = method === 'cash' || (reference.trim() !== '' && proofUrl !== '')
  const valid = Boolean(customer) && value > 0 && value <= maxAmount && transferReady

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!valid || !customer || saving) return
    setSaving(true)
    setError(null)
    const result = await dispatch(
      payThunk({
        customerId: customer.id,
        amount: value,
        saleId: saleId ? Number(saleId) : undefined,
        details: method === 'transfer' ? { method, reference: reference.trim(), proofUrl } : { method },
      })
    )
    setSaving(false)
    if (payThunk.fulfilled.match(result)) {
      onDone?.()
      dispatch(closeDrawerForm())
    } else {
      setError(result.payload ?? 'No se pudo registrar el abono.')
    }
  }

  return {
    warehouseName: warehouseName ?? '',
    query,
    setQuery,
    clients,
    searching: search.status === 'loading',
    customer,
    choose,
    pending,
    loadingInvoices: invoicesState.status === 'loading',
    debt,
    saleId,
    setSaleId,
    amount,
    setAmount,
    maxAmount,
    method,
    setMethod,
    reference,
    setReference,
    proofUrl,
    fileName,
    attach,
    valid,
    saving,
    error,
    submit,
    cancel: () => dispatch(closeDrawerForm()),
  }
}
