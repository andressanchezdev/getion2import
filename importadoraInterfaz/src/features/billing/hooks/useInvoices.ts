// useInvoices · pide las facturas generales o por bodega seleccionada y maneja la búsqueda y el filtro de estado
// conecta con: InvoicesTable (lo usa), billing.thunks (loadInvoicesThunk), billing.service (annulInvoice), billing.selectors, billing.adapter (filtrar), auth (hay sesión) y toast
import { useCallback, useEffect, useMemo, useState } from 'react'
import { selectCurrentUser } from '@/features/auth'
import { getErrorMessage } from '@/api/http/errors'
import { toast } from '@/global/helpers/feedback/toast'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { filterInvoices } from '../helpers/billing.adapter'
import { selectBilling } from '../selectors/billing.selectors'
import { annulInvoice } from '../services/billing.service'
import { loadInvoicesThunk } from '../thunks/billing.thunks'
import type { Invoice, InvoiceStatus } from '../types/billing.types'

export const useInvoices = () => {
  const dispatch = useAppDispatch()
  const hasSession = Boolean(useAppSelector(selectCurrentUser))
  const warehouses = useAppSelector((state) => state.warehouses.items)
  const billing = useAppSelector(selectBilling)
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<InvoiceStatus | 'all'>('all')

  const reload = useCallback(() => {
    if (hasSession) {
      dispatch(loadInvoicesThunk(selectedWarehouseId ? selectedWarehouseId : undefined))
    }
  }, [dispatch, hasSession, selectedWarehouseId])

  useEffect(reload, [reload])

  // anula una factura emitida con su motivo y recarga la lista para mostrar el nuevo estado
  const annul = useCallback(
    async (invoice: Invoice, reason: string) => {
      try {
        await annulInvoice(invoice.id, reason)
        toast.success(`Factura ${invoice.number} anulada.`)
        reload()
      } catch (err) {
        toast.error(getErrorMessage(err, 'No se pudo anular la factura.'))
      }
    },
    [reload]
  )

  const isCurrent = billing.warehouseId === selectedWarehouseId
  const all = useMemo(() => (isCurrent ? billing.invoices : []), [isCurrent, billing.invoices])
  const items = useMemo(() => filterInvoices(all, search, status), [all, search, status])
  const clearFilters = () => {
    setSearch('')
    setStatus('all')
    setSelectedWarehouseId(null)
  }

  return {
    items,
    total: all.length,
    selectedWarehouseId,
    setSelectedWarehouseId,
    warehouses,
    loading: !isCurrent || billing.invoicesStatus === 'idle' || billing.invoicesStatus === 'loading',
    failed: isCurrent && billing.invoicesStatus === 'failed',
    error: billing.invoicesError,
    search,
    setSearch,
    status,
    setStatus,
    hasFilters: search !== '' || status !== 'all' || selectedWarehouseId !== null,
    clearFilters,
    reload,
    annul,
  }
}
