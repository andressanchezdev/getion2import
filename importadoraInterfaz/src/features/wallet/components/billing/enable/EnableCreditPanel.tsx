// EnableCreditPanel · formulario lateral para habilitar cupo y plazo de crédito a un cliente
// conecta con: useEnableCreditForm (estado y guardado), CreditCustomerPicker (buscador) y navigation (cerrar el panel); lo abren el botón «Habilitar crédito» de Cartera (con buscador) y el ícono de dinero de la tabla de clientes (con el cliente ya elegido)
import React from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { closeDrawerForm } from '@/features/navigation'
import { MoneyInput } from '@/global/components/UI/molecules/form'
import { useEnableCreditForm } from '../../../hooks/useEnableCreditForm'
import type { EnableCreditPayload } from '../../../types/wallet.types'
import { CreditCustomerPicker } from './CreditCustomerPicker'
import './EnableCreditPanel.css'

interface EnableCreditPanelProps {
  customer?: EnableCreditPayload // si llega, el cliente ya está elegido y no se muestra el buscador
}

// buscador (si hace falta) y formulario con cupo, plazo y estado del crédito
export const EnableCreditPanel: React.FC<EnableCreditPanelProps> = ({ customer }) => {
  const dispatch = useAppDispatch()
  const form = useEnableCreditForm(customer)
  const { selectedCustomer, submitting } = form

  return (
    <form className="drawer-form enable-credit-panel" onSubmit={form.submit}>
      <div className="drawer-form-body enable-credit-body">
        {!customer && (
          <CreditCustomerPicker
            query={form.query}
            onQuery={form.setQuery}
            customers={form.customers}
            loading={form.loading}
            selectedId={selectedCustomer?.id}
            onSelect={form.select}
          />
        )}

        {selectedCustomer && (
          <div className="enable-credit-form-card">
            <div className="enable-credit-selected-info">
              <span className="enable-credit-subtitle">{customer ? 'Cliente:' : 'Cliente seleccionado:'}</span>
              <strong>{selectedCustomer.name}</strong>
              <small>Doc: {selectedCustomer.identification}</small>
            </div>

            <div className="enable-credit-field drawer-form-field">
              <label className="enable-credit-label drawer-form-label" htmlFor="quotaInput">
                Cupo de Crédito (COP)
              </label>
              <MoneyInput
                id="quotaInput"
                className="enable-credit-input font-mono drawer-form-control"
                value={form.quota || ''}
                placeholder="0"
                onValueChange={(digits) => form.setQuota(Number(digits || 0))}
                required
              />
            </div>

            <div className="enable-credit-field drawer-form-field">
              <label className="enable-credit-label drawer-form-label" htmlFor="daysInput">
                Días de Plazo para Pago
              </label>
              <input
                id="daysInput"
                type="number"
                min="1"
                max="360"
                className="enable-credit-input font-mono drawer-form-control"
                value={form.days}
                onChange={(e) => form.setDays(Math.max(1, Number(e.target.value)))}
                required
              />
            </div>

            <div className="enable-credit-switch-field">
              <label className="enable-credit-checkbox-label">
                <input type="checkbox" checked={form.isCredit} onChange={(e) => form.setIsCredit(e.target.checked)} />
                <span>Habilitar línea de crédito activa</span>
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="drawer-form-footer enable-credit-footer">
        <button type="button" className="btn-secondary" onClick={() => dispatch(closeDrawerForm())} disabled={submitting}>
          Cancelar
        </button>
        {selectedCustomer && (
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Guardando…' : 'Habilitar Crédito'}
          </button>
        )}
      </div>
    </form>
  )
}

export default EnableCreditPanel
