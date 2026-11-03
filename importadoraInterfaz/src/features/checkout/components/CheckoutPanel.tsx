// CheckoutPanel · finalizar compra (o cotizar) en el panel derecho: primero el cliente y los datos de entrega (y el empleado si lo hace un administrador), después el pago
// conecta con: formRegistry (lo muestra), useCheckoutFlow (estado y confirmación), CustomerStep, PaymentStep, navigation (closeDrawerForm) y CheckoutPanel.css
// ojo: la cotización termina en el paso del cliente; la venta sigue al paso de pago; una cotización que se continúa llega con sus renglones (payload.quotationId)
import React from 'react'
import './CheckoutPanel.css'
import { closeDrawerForm } from '@/features/navigation'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { useCheckoutFlow } from '../hooks/useCheckoutFlow'
import type { CheckoutPayload } from '../types/checkout.types'
import { CustomerStep } from './CustomerStep'
import { PaymentStep } from './PaymentStep'

export const CheckoutPanel: React.FC<{ payload: CheckoutPayload }> = ({ payload }) => {
  const dispatch = useAppDispatch()
  const flow = useCheckoutFlow(payload)
  const onPayment = flow.step === 'payment'

  return (
    <div className="checkout">
      <div className="checkout-body">
        {flow.lines === null && !flow.error && <p className="checkout-hint">Preparando la compra…</p>}
        {flow.lines?.length === 0 && <p className="checkout-hint">No hay productos para continuar.</p>}
        {onPayment ? <PaymentStep flow={flow} /> : <CustomerStep flow={flow} />}
        {flow.error && <div className="form-field-error-msg">{flow.error}</div>}
        {!flow.canContinue && flow.blockers.length > 0 && flow.customer && (
          <ul className="checkout-blockers" aria-live="polite">
            {flow.blockers.map((message) => <li key={message}>{message}</li>)}
          </ul>
        )}
      </div>

      <div className="checkout-footer">
        {onPayment ? (
          <button type="button" className="btn-secondary" onClick={() => flow.setStep('customer')}>← Atrás</button>
        ) : (
          <button type="button" className="btn-secondary" onClick={() => dispatch(closeDrawerForm())}>Cancelar</button>
        )}
        {flow.isQuotation ? (
          <button type="button" className="btn-primary" disabled={!flow.canContinue || flow.submitting} onClick={flow.confirm}>{flow.submitting ? 'Creando...' : 'Crear cotización'}</button>
        ) : onPayment ? (
          <button type="button" className="btn-primary" disabled={flow.submitting || flow.cashBlocked} title={flow.cashBlocked ? 'Abre el turno de caja o elige otra forma de pago' : undefined} onClick={flow.confirm}>{flow.submitting ? 'Creando pedido...' : 'Confirmar pedido'}</button>
        ) : (
          <button type="button" className="btn-primary" disabled={!flow.canContinue} onClick={() => flow.setStep('payment')}>Continuar al pago</button>
        )}
      </div>
    </div>
  )
}

export default CheckoutPanel
