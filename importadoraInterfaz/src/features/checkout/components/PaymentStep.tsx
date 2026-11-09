// PaymentStep · segundo paso: resumen fiscal del pedido, forma de pago con selector interactivo y picking inmediato
import React from 'react'
import { CashClosedBanner } from '@/features/cashRegister'
import { formatPesos } from '@/global/helpers/formatting/format'
import type { useCheckoutFlow } from '../hooks/useCheckoutFlow'
import { TransferPaymentSection } from './TransferPaymentSection'
import { Icon } from '@/global/components/UI/atoms/Icon'
import walletIcon from '@/assets/icons/wallet.svg?raw'
import buildingIcon from '@/assets/icons/building.svg?raw'
import receiptIcon from '@/assets/icons/receipt.svg?raw'

type Flow = ReturnType<typeof useCheckoutFlow>

export const PaymentStep: React.FC<{ flow: Flow }> = ({ flow }) => {
  const { customer } = flow
  if (!customer || !flow.lines) return null
  const { totals } = flow

  return (
    <div className="checkout-section">
      <h4 className="checkout-title">
        <span>Resumen del pedido</span>
        <small style={{ fontWeight: 'normal', fontSize: '11.5px', color: 'var(--color-text-secondary)' }}>
          {flow.lines.length} {flow.lines.length === 1 ? 'ítem' : 'ítems'}
        </small>
      </h4>

      <ul className="checkout-lines">
        {flow.lines.map((line) => (
          <li key={line.stockId}>
            <span>{line.name} ×{line.quantity}</span>
            <b>{formatPesos(line.unitPrice * line.quantity)}</b>
          </li>
        ))}
      </ul>

      <div className="checkout-totals-card">
        <div className="checkout-totals-row">
          <span>Subtotal neto</span>
          <b>{formatPesos(totals.subtotal)}</b>
        </div>
        {totals.discount > 0 && (
          <div className="checkout-totals-row is-discount">
            <span>Descuento de cliente ({customer.discountPercent}%)</span>
            <b>-{formatPesos(totals.discount)}</b>
          </div>
        )}
        <div className="checkout-totals-row">
          <span>IVA estimado</span>
          <b>{formatPesos(totals.iva)}</b>
        </div>
        <div className="checkout-totals-divider" />
        <div className="checkout-totals-grand">
          <span>Total a pagar</span>
          <span className="grand-amount">{formatPesos(totals.total)}</span>
        </div>
      </div>

      <h4 className="checkout-title" style={{ marginTop: '0.5rem' }}>
        <span>Forma de pago</span>
      </h4>

      <div className="checkout-pay">
        {/* Efectivo */}
        <button
          type="button"
          role="radio"
          aria-checked={flow.payment === 'cash'}
          className={`checkout-pay-card ${flow.payment === 'cash' ? 'checkout-pay-card-on' : ''}`}
          onClick={() => flow.setPayment('cash')}
        >
          <div className="checkout-pay-left">
            <span className="checkout-pay-icon"><Icon svg={walletIcon} size="lg" /></span>
            <div className="checkout-pay-meta">
              <strong>Efectivo</strong>
              <small>Pago de contado en mostrador</small>
            </div>
          </div>
          <span className="checkout-pay-indicator">✓</span>
        </button>

        {/* Transferencia */}
        <button
          type="button"
          role="radio"
          aria-checked={flow.payment === 'transfer'}
          className={`checkout-pay-card ${flow.payment === 'transfer' ? 'checkout-pay-card-on' : ''}`}
          onClick={() => flow.setPayment('transfer')}
        >
          <div className="checkout-pay-left">
            <span className="checkout-pay-icon"><Icon svg={buildingIcon} size="lg" /></span>
            <div className="checkout-pay-meta">
              <strong>Transferencia Bancaria</strong>
              <small>Bancolombia, Nequi, Daviplata</small>
            </div>
          </div>
          <span className="checkout-pay-indicator">✓</span>
        </button>

        {/* Crédito */}
        {customer.creditEnabled && (
          <button
            type="button"
            role="radio"
            aria-checked={flow.payment === 'credit'}
            disabled={!flow.creditAllowed}
            className={`checkout-pay-card ${flow.payment === 'credit' ? 'checkout-pay-card-on' : ''}`}
            onClick={() => flow.setPayment('credit')}
          >
            <div className="checkout-pay-left">
              <span className="checkout-pay-icon"><Icon svg={receiptIcon} size="lg" /></span>
              <div className="checkout-pay-meta">
                <strong>Crédito de Cartera</strong>
                <small>
                  {flow.creditAllowed
                    ? `Cupo: ${formatPesos(customer.availableCredit)} · Plazo ${customer.creditDays}d`
                    : 'Cupo de crédito insuficiente'}
                </small>
              </div>
            </div>
            <span className="checkout-pay-indicator">✓</span>
          </button>
        )}
      </div>

      {flow.cashBlocked && (
        <div style={{ marginTop: '0.5rem' }}>
          <CashClosedBanner warehouseName={flow.cashWarehouseName} />
        </div>
      )}

      {flow.payment === 'transfer' && <TransferPaymentSection flow={flow} />}

      {!flow.isQuotation && (
        <div
          style={{
            marginTop: '0.75rem',
            padding: '10px 14px',
            background: 'var(--bg-card-inner, #f8fafc)',
            border: '1px solid var(--color-border, #e2e8f0)',
            borderRadius: 'var(--radius-md, 6px)',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={flow.immediatePicking}
              onChange={(e) => flow.setImmediatePicking(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary, #2563eb)', cursor: 'pointer' }}
            />
            <div>
              <strong style={{ fontSize: '13px', color: 'var(--color-text-primary, #0f172a)', display: 'block' }}>
                Despacho con picking inmediato
              </strong>
              <small style={{ fontSize: '11px', color: 'var(--color-text-secondary, #64748b)' }}>
                Alistamiento prioritario en mostrador / sin cola regular
              </small>
            </div>
          </label>
        </div>
      )}
    </div>
  )
}

export default PaymentStep
