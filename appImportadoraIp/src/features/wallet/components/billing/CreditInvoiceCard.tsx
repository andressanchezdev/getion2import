// CreditInvoiceCard · tarjeta de una factura: número, estado, fechas, saldos y botón de pagar
// conecta con: CreditInvoiceList (por cada factura); el pago lo ejecuta useCreditPayment vía onPay
import React from 'react'
import { formatCOP } from '@/global/helpers/format'
import type { CreditInvoiceCardProps } from '../../types/wallet.account.types'
import './CreditInvoiceCard.css'

export const CreditInvoiceCard: React.FC<CreditInvoiceCardProps> = ({ invoice: inv, disabled, onPay }) => {
  return (
    <div className="credit-drawer-invoice-item-card">
      <div className="credit-drawer-invoice-item-header">
        <div>
          <span className="credit-drawer-invoice-num">{inv.invoiceNumber}</span>
          <span className="credit-drawer-invoice-order">({inv.orderNumber})</span>
        </div>
        <span
          className={`credit-drawer-invoice-status-chip ${
            inv.status === 'overdue' ? 'credit-drawer-status-overdue' : 'credit-drawer-status-current'
          }`}
        >
          {inv.status === 'overdue' ? `Vencida (${inv.daysOverdue}d)` : 'Vigente'}
        </span>
      </div>

      <div className="credit-drawer-invoice-item-dates">
        <span>Emisión: {inv.issueDate}</span>
        <span>Vence: {inv.dueDate}</span>
      </div>

      <div className="credit-drawer-invoice-item-balances">
        <div className="credit-drawer-balance-row">
          <span>Total Factura:</span>
          <strong>{formatCOP(inv.totalAmount)}</strong>
        </div>
        <div className="credit-drawer-balance-row">
          <span>Saldo Pendiente:</span>
          <strong className="credit-drawer-invoice-text-rose">{formatCOP(inv.pendingBalance)}</strong>
        </div>
      </div>

      {inv.pendingBalance > 0 && (
        <button
          type="button"
          onClick={() => onPay(inv.saleId, inv.pendingBalance)}
          disabled={disabled}
          className="credit-drawer-invoice-pay-btn"
        >
          Pagar Total Factura ({formatCOP(inv.pendingBalance)})
        </button>
      )}
    </div>
  )
}

export default CreditInvoiceCard
