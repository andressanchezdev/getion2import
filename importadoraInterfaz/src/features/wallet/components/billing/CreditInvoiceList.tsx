// CreditInvoiceList · sección de facturas pendientes del cliente (lista o mensaje de "al día")
// conecta con: CreditAccountDetail (facturas y acción de pagar); pinta una CreditInvoiceCard por factura
import React from 'react'
import { CreditInvoiceCard } from './CreditInvoiceCard'
import type { CreditInvoiceListProps } from '../../types/wallet.account.types'
import './CreditInvoiceList.css'

export const CreditInvoiceList: React.FC<CreditInvoiceListProps> = ({ invoices, status, error, disabled, onPayInvoice }) => {
  // ojo: el backend devuelve también las facturas ya pagadas; esta sección solo muestra las que tienen saldo
  const pending = invoices.filter((invoice) => invoice.pendingBalance > 0)

  return (
    /* Facturas Pendientes */
    <div className="credit-drawer-invoices-section">
      <h4 className="credit-drawer-invoices-section-title">
        Facturas Pendientes ({pending.length})
      </h4>

      {status === 'failed' ? (
        <div className="credit-drawer-invoices-empty">
          <span>{error}</span>
        </div>
      ) : invoices.length === 0 && status !== 'succeeded' ? (
        <div className="credit-drawer-invoices-empty">
          <span>Cargando facturas…</span>
        </div>
      ) : pending.length > 0 ? (
        <div className="credit-drawer-invoices-list">
          {pending.map((inv) => (
            <CreditInvoiceCard key={inv.id} invoice={inv} disabled={disabled} onPay={onPayInvoice} />
          ))}
        </div>
      ) : (
        <div className="credit-drawer-invoices-empty">
          <span>Este cliente se encuentra al día, no tiene facturas pendientes.</span>
        </div>
      )}
    </div>
  )
}

export default CreditInvoiceList
