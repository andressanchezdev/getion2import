// CreateAbonoPanel · formulario en el panel derecho para registrar un abono a cartera: cliente con crédito, factura, monto, método y comprobante
// conecta con: useCreateAbono (búsqueda, estado y guardado), MoneyInput, DrawerFormShell.css (armazón) y global format; lo abre formRegistry («createAbono»)
// ojo: la bodega no se elige, es la del empleado que registra; la transferencia exige referencia y foto del comprobante y queda en revisión hasta conciliarla con el banco
import React from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import './CreateAbonoPanel.css'
import { MoneyInput } from '@/global/components/UI/molecules/form'
import { formatCOP } from '@/global/helpers/formatting/format'
import { useCreateAbono, type CreateAbonoPayload } from '../../hooks/useCreateAbono'

export const CreateAbonoPanel: React.FC<{ payload?: CreateAbonoPayload }> = ({ payload }) => {
  const form = useCreateAbono(payload?.onDone)

  return (
    <form className="drawer-form" onSubmit={form.submit}>
      <div className="drawer-form-body">
        <p className="drawer-form-note">
          Bodega que recibe el abono: <strong>{form.warehouseName || 'la de tu sesión'}</strong>
        </p>
        {form.error && <div className="form-field-error-msg">{form.error}</div>}

        <div className="drawer-form-field">
          <label className="drawer-form-label" htmlFor="abono-search">Cliente con crédito</label>
          {form.customer ? (
            <div className="abono-selected">
              <div>
                <strong>{form.customer.name}</strong>
                <small>Doc: {form.customer.identification || 'N/A'} · Cupo {formatCOP(form.customer.creditLimit)}</small>
                <small>{form.loadingInvoices ? 'Consultando facturas…' : `Debe ${formatCOP(form.debt)}`}</small>
              </div>
              <button type="button" className="btn-secondary" onClick={() => form.choose(null)}>Cambiar</button>
            </div>
          ) : (
            <>
              <input id="abono-search" className="drawer-form-control" value={form.query} onChange={(e) => form.setQuery(e.target.value)} placeholder="Busca por nombre, documento o correo..." autoComplete="off" autoFocus />
              <ul className="abono-results" aria-label="Clientes con crédito">
                {form.clients.map((client) => (
                  <li key={client.id}>
                    <button type="button" className="abono-option" onClick={() => form.choose(client)}>
                      <strong>{client.name}</strong>
                      <span>Doc: {client.identification || 'N/A'}</span>
                    </button>
                  </li>
                ))}
                {!form.searching && form.clients.length === 0 && <li className="abono-empty">No hay clientes con crédito para mostrar.</li>}
              </ul>
            </>
          )}
        </div>

        {form.customer && !form.loadingInvoices && form.pending.length === 0 && <div className="drawer-form-note">Este cliente no tiene facturas con saldo pendiente.</div>}

        {form.customer && form.pending.length > 0 && (
          <>
            <div className="drawer-form-field">
              <label className="drawer-form-label" htmlFor="abono-sale">Aplicar a</label>
              <select id="abono-sale" className="drawer-form-control" value={form.saleId} onChange={(e) => form.setSaleId(e.target.value)} disabled={form.saving}>
                <option value="">Las facturas más antiguas primero (deuda {formatCOP(form.debt)})</option>
                {form.pending.map((invoice) => (
                  <option key={invoice.saleId} value={invoice.saleId}>
                    {invoice.invoiceNumber} · saldo {formatCOP(invoice.pendingBalance)}
                  </option>
                ))}
              </select>
            </div>

            <div className="drawer-form-field">
              <label className="drawer-form-label" htmlFor="abono-amount">Monto a abonar</label>
              <MoneyInput id="abono-amount" className="drawer-form-control" value={form.amount} onValueChange={form.setAmount} max={form.maxAmount} placeholder="Ej: 500.000" disabled={form.saving} required />
              <button type="button" className="btn-secondary abono-all" onClick={() => form.setAmount(String(form.maxAmount))} disabled={form.saving}>
                Abonar todo ({formatCOP(form.maxAmount)})
              </button>
            </div>

            <div className="drawer-form-field">
              <label className="drawer-form-label" htmlFor="abono-method">Método de pago</label>
              <select id="abono-method" className="drawer-form-control" value={form.method} onChange={(e) => form.setMethod(e.target.value as 'cash' | 'transfer')} disabled={form.saving}>
                <option value="cash">Efectivo (recibido en la caja)</option>
                <option value="transfer">Transferencia (con comprobante)</option>
              </select>
              <span className="drawer-form-hint">
                {form.method === 'cash' ? 'El abono queda verificado y baja la deuda en seguida.' : 'Queda en revisión: baja la deuda cuando cartera lo concilie con el banco.'}
              </span>
            </div>

            {form.method === 'transfer' && (
              <>
                <div className="drawer-form-field">
                  <label className="drawer-form-label" htmlFor="abono-reference">Referencia del comprobante *</label>
                  <input id="abono-reference" className="drawer-form-control" value={form.reference} onChange={(e) => form.setReference(e.target.value)} placeholder="Ej: Aprobación 987654" disabled={form.saving} required />
                </div>
                <div className="drawer-form-field">
                  <label className="drawer-form-label" htmlFor="abono-proof">Foto del comprobante *</label>
                  <input id="abono-proof" className="drawer-form-control" type="file" accept="image/*" onChange={(e) => form.attach(e.target.files?.[0])} disabled={form.saving} />
                  {form.fileName && <span className="drawer-form-hint">Archivo: {form.fileName}</span>}
                  {form.proofUrl && <img className="abono-proof" src={form.proofUrl} alt="Comprobante del abono" />}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="drawer-form-footer">
        <button type="button" className="btn-secondary" disabled={form.saving} onClick={form.cancel}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={!form.valid || form.saving}>
          {form.saving ? 'Registrando…' : 'Registrar abono'}
        </button>
      </div>
    </form>
  )
}

export default CreateAbonoPanel
