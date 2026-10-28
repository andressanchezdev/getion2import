// CreditAccountDetail · estado de cuenta de un cliente: métricas, abono y facturas
// ojo: el encabezado (nombre, NIT y cerrar) ahora lo pinta el panel derecho (DrawerHeader) con wallet.selectors (selectAccountDrawerMeta)
// conecta con: CreditAccountDrawer (le pasa el cliente), useAccountData (facturas), useCreditPayment (abonos) y CreditLimitForm (cupo y plazo)
import React from 'react'
import './CreditAccountDetail.css'
import { useAppSelector } from '@/global/hooks/useRedux'
import { useAccountData } from '../../hooks/useAccountData'
import { useCreditPayment } from '../../hooks/useCreditPayment'
import { selectWalletInvoices } from '../../selectors/wallet.selectors'
import { CreditLimitForm } from '../billing/CreditLimitForm'
import { CreditAccountMetrics } from './CreditAccountMetrics'
import { CreditPaymentForm } from '../billing/CreditPaymentForm'
import { CreditInvoiceList } from '../billing/CreditInvoiceList'
import type { CreditAccountDetailProps } from '../../types/wallet.account.types'

export const CreditAccountDetail: React.FC<CreditAccountDetailProps> = ({ customer }) => {
  // ojo: las facturas se piden al backend al abrir el estado de cuenta; mientras un abono o un cambio de cupo se procesa, los botones se bloquean
  useAccountData(customer.id)
  const invoices = useAppSelector(selectWalletInvoices)
  const { paymentAmount, setPaymentAmount, successMessage, submitPayment } = useCreditPayment(customer.id)

  return (
    <div className="credit-drawer">
      <div className="credit-drawer-body">
        <CreditAccountMetrics
          usedCredit={customer.usedCredit}
          availableCredit={customer.availableCredit}
          creditLimit={customer.creditLimit}
        />

        {/* Notificación de éxito */}
        {successMessage && <div className="credit-drawer-alert-success">{successMessage}</div>}

        {customer.usedCredit > 0 && (
          <CreditPaymentForm
            amount={paymentAmount}
            disabled={invoices.saving}
            onAmountChange={setPaymentAmount}
            onSubmit={() => submitPayment()}
          />
        )}

        {/* ojo: key con los datos del cupo: al guardar y releer, el formulario se arma de nuevo con lo guardado */}
        <CreditLimitForm
          key={`${customer.id}-${customer.creditLimit}-${customer.creditDays}-${customer.isCredit}`}
          customer={customer}
          disabled={invoices.saving}
        />

        <CreditInvoiceList
          invoices={invoices.items}
          status={invoices.status}
          error={invoices.error}
          disabled={invoices.saving}
          onPayInvoice={(saleId, amount) => submitPayment(saleId, amount)}
        />
      </div>
    </div>
  )
}

export default CreditAccountDetail
