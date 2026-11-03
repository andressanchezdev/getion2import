// PaymentStep · segundo paso: resumen de la compra con descuento, forma de pago y opción de picking inmediato
// conecta con: CheckoutPanel (lo usa), useCheckoutFlow (estado), TransferPaymentSection (comprobante), checkout.adapter (cálculos) y CheckoutPanel.css
import React from 'react'
import { CashClosedBanner } from '@/features/cashRegister'
import { formatPesos } from '@/global/helpers/formatting/format'
import type { useCheckoutFlow } from '../hooks/useCheckoutFlow'
import { TransferPaymentSection } from './TransferPaymentSection'

type Flow = ReturnType<typeof useCheckoutFlow>

export const PaymentStep: React.FC<{ flow: Flow }> = ({ flow }) => {
  const { customer } = flow
  if (!customer || !flow.lines) return null
  const { totals } = flow

  return (
    <div className="checkout-section">
      <h4 className="checkout-title">Resumen del pedido</h4>
      <ul className="checkout-lines">
        {flow.lines.map((line) => (
          <li key={line.stockId}>
            <span>{line.name} x{line.quantity}</span>
            <b>{formatPesos(line.unitPrice * line.quantity)}</b>
          </li>
        ))}
      </ul>
      <div className="checkout-totals">
        <span>Subtotal (neto)</span><b>{formatPesos(totals.subtotal)}</b>
        {totals.discount > 0 && (<><span>Descuento del cliente ({customer.discountPercent} %)</span><b>-{formatPesos(totals.discount)}</b></>)}
        <span>IVA</span><b>{formatPesos(totals.iva)}</b>
        <span>Total a pagar</span><b className="checkout-total">{formatPesos(totals.total)}</b>
      </div>

      <h4 className="checkout-title">Forma de pago</h4>
      <div className="checkout-pay">
        <button
          type="button"
          role="radio"
          aria-checked={flow.payment === 'cash'}
          className={`checkout-pay-card ${flow.payment === 'cash' ? 'checkout-pay-card-on' : ''}`}
          onClick={() => flow.setPayment('cash')}
        >
          <strong>Efectivo</strong>
          <small>Pago de contado</small>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={flow.payment === 'transfer'}
          className={`checkout-pay-card ${flow.payment === 'transfer' ? 'checkout-pay-card-on' : ''}`}
          onClick={() => flow.setPayment('transfer')}
        >
          <strong>Transferencia</strong>
          <small>Bancolombia, Nequi, etc.</small>
        </button>

        {customer.creditEnabled && (
          <button
            type="button"
            role="radio"
            aria-checked={flow.payment === 'credit'}
            disabled={!flow.creditAllowed}
            className={`checkout-pay-card ${flow.payment === 'credit' ? 'checkout-pay-card-on' : ''}`}
            onClick={() => flow.setPayment('credit')}
          >
            <strong>Crédito</strong>
            <small>{flow.creditAllowed ? `Cupo ${formatPesos(customer.availableCredit)} · ${customer.creditDays}d` : `Cupo insuficiente`}</small>
          </button>
        )}
      </div>

      {flow.cashBlocked && <CashClosedBanner warehouseName={flow.cashWarehouseName} />}
      {flow.payment === 'transfer' && <TransferPaymentSection flow={flow} />}

      {!flow.isQuotation && (
        <div style={{ marginTop: '1.25rem', padding: '12px 14px', background: 'var(--bg-subtle, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={flow.immediatePicking}
              onChange={(e) => flow.setImmediatePicking(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#2563eb', cursor: 'pointer' }}
            />
            <div>
              <strong style={{ fontSize: '13.5px', color: '#1e293b', display: 'block' }}>⚡ Despacho con Picking Inmediato</strong>
              <small style={{ fontSize: '11.5px', color: '#64748b' }}>Alistamiento prioritario en mostrador / bodega sin cola estándar</small>
            </div>
          </label>
        </div>
      )}
    </div>
  )
}

export default PaymentStep
