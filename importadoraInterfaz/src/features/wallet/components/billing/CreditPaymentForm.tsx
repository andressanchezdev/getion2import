// CreditPaymentForm · formulario de abono rápido (monto + botón Abonar)
// conecta con: CreditAccountDetail (monto y acción llegan por props desde useCreditPayment)
import React from 'react'
import type { CreditPaymentFormProps } from '../../types/wallet.account.types'
import './CreditPaymentForm.css'

export const CreditPaymentForm: React.FC<CreditPaymentFormProps> = ({ amount, disabled, onAmountChange, onSubmit }) => {
  return (
    /* Formulario de Abono Rápido */
    <div className="credit-drawer-payment-card">
      <h4 className="credit-drawer-payment-card-title">Registrar Abono / Pago</h4>
      <div className="credit-drawer-payment-input-group">
        <span className="credit-drawer-payment-currency-prefix">$</span>
        <input
          type="number"
          placeholder="Digitar valor en COP"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          className="credit-drawer-payment-input"
        />
        <button type="button" onClick={onSubmit} className="credit-drawer-payment-submit-btn" disabled={disabled}>
          Abonar
        </button>
      </div>
      <span className="credit-drawer-payment-hint">
        El abono se aplicará automáticamente a la factura más antigua.
      </span>
    </div>
  )
}

export default CreditPaymentForm
