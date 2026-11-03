// useEnableCreditForm · estado del formulario para habilitar crédito: cliente elegido, cupo, plazo y guardado
// conecta con: EnableCreditPanel (lo usa), useCreditCustomerSearch (busca clientes), wallet.payments.thunks (guarda el cupo), navigation (cerrar el panel) y toast
import { useState } from 'react'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { closeDrawerForm } from '@/features/navigation'
import { toast } from '@/global/helpers/feedback/toast'
import { updateCreditThunk } from '../thunks/wallet.payments.thunks'
import type { CreditCustomerOption, EnableCreditPayload } from '../types/wallet.types'
import { useCreditCustomerSearch } from './useCreditCustomerSearch'

const DEFAULT_QUOTA = 1000000
const DEFAULT_DAYS = 30

// maneja la búsqueda, el cliente elegido y los valores del crédito; `customer` llega cuando el cliente ya está elegido
export const useEnableCreditForm = (customer?: EnableCreditPayload) => {
  const dispatch = useAppDispatch()
  const [query, setQuery] = useState('')
  // con cliente elegido se busca por su documento solo para traer su cupo y plazo actuales
  const { items: customers, status } = useCreditCustomerSearch(customer ? customer.identification : query)
  const [pickedCustomer, setPickedCustomer] = useState<CreditCustomerOption | null>(null)
  const knownCustomer = customer ? customers.find((c) => c.id === customer.id) : undefined
  const selectedCustomer: CreditCustomerOption | null =
    pickedCustomer ??
    knownCustomer ??
    (customer ? { id: customer.id, name: customer.name, identification: customer.identification, creditLimit: 0, creditDays: DEFAULT_DAYS, isCredit: false } : null)

  // lo que el usuario escribe manda; si no ha escrito nada se usa el cupo y plazo actuales del cliente, y si no tiene, los de partida
  const [quotaInput, setQuotaInput] = useState<number | null>(null)
  const [daysInput, setDaysInput] = useState<number | null>(null)
  const quota = quotaInput ?? (selectedCustomer && selectedCustomer.creditLimit > 0 ? selectedCustomer.creditLimit : DEFAULT_QUOTA)
  const days = daysInput ?? (selectedCustomer && selectedCustomer.creditDays > 0 ? selectedCustomer.creditDays : DEFAULT_DAYS)
  const [isCredit, setIsCredit] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState(false)

  // elige un cliente de la lista y reinicia los valores escritos
  const select = (c: CreditCustomerOption) => {
    setPickedCustomer(c)
    setQuotaInput(null)
    setDaysInput(null)
    setIsCredit(true)
  }

  // valida cliente y cupo, guarda el crédito y cierra el panel
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedCustomer) {
      toast.error('Por favor selecciona un cliente.')
      return
    }
    if (quota <= 0) {
      toast.error('El cupo asignado debe ser mayor a 0.')
      return
    }
    setSubmitting(true)
    try {
      await dispatch(updateCreditThunk({ customerId: selectedCustomer.id, quota, days, isCredit })).unwrap()
      toast.success(`¡Crédito habilitado exitosamente para ${selectedCustomer.name}!`)
      dispatch(closeDrawerForm())
    } catch {
      // toast ya notificado en el thunk
    } finally {
      setSubmitting(false)
    }
  }

  return {
    query,
    setQuery,
    customers,
    loading: status === 'loading',
    selectedCustomer,
    select,
    quota,
    setQuota: setQuotaInput,
    days,
    setDays: setDaysInput,
    isCredit,
    setIsCredit,
    submitting,
    submit,
  }
}
