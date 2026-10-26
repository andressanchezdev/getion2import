// CreditLimitForm · formulario plegable para cambiar el cupo, el plazo y si el cliente tiene crédito (PUT /users/credit)
// conecta con: CreditAccountDetail (le pasa el cliente); wallet.payments.thunks (updateCreditThunk); al guardar se vuelve a leer la lista y los totales
// ojo: el formulario es local (no va al estado global); se vuelve a crear cuando cambian los datos del cliente (key en CreditAccountDetail) para mostrar lo guardado
import React, { useState } from 'react'
import { useAppDispatch } from '@/global/hooks/useRedux'
import { updateCreditThunk } from '../../thunks/wallet.payments.thunks'
import type { CreditLimitFormProps } from '../../types/wallet.account.types'
import './CreditLimitForm.css'

export const CreditLimitForm: React.FC<CreditLimitFormProps> = ({ customer, disabled }) => {
  const dispatch = useAppDispatch()
  const [isOpen, setIsOpen] = useState(false)
  const [quota, setQuota] = useState(String(customer.creditLimit))
  const [days, setDays] = useState(String(customer.creditDays))
  const [isCredit, setIsCredit] = useState(customer.isCredit)

  const quotaValue = Number(quota)
  const daysValue = Number(days)
  const isValid = Number.isFinite(quotaValue) && quotaValue >= 0 && Number.isInteger(daysValue) && daysValue >= 0

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isValid || disabled) return
    const result = await dispatch(updateCreditThunk({ customerId: customer.id, quota: quotaValue, days: daysValue, isCredit }))
    if (updateCreditThunk.fulfilled.match(result)) setIsOpen(false)
  }

  return (
    <div className="credit-limit-card">
      <button type="button" className="credit-limit-toggle" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen}>
        {isOpen ? 'Cerrar edición de cupo' : 'Editar cupo y plazo'}
      </button>

      {isOpen && (
        <form className="credit-limit-form" onSubmit={handleSubmit}>
          <label className="credit-limit-field">
            <span>Cupo (COP)</span>
            <input type="number" min={0} value={quota} onChange={(event) => setQuota(event.target.value)} />
          </label>
          <label className="credit-limit-field">
            <span>Plazo (días)</span>
            <input type="number" min={0} step={1} value={days} onChange={(event) => setDays(event.target.value)} />
          </label>
          <label className="credit-limit-check">
            <input type="checkbox" checked={isCredit} onChange={(event) => setIsCredit(event.target.checked)} />
            <span>Crédito habilitado</span>
          </label>
          <button type="submit" className="credit-limit-submit" disabled={!isValid || disabled}>
            Guardar cupo
          </button>
        </form>
      )}
    </div>
  )
}

export default CreditLimitForm
