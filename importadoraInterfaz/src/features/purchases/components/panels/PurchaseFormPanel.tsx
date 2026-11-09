// PurchaseFormPanel · formulario en el panel derecho para crear una orden de compra: proveedor, referencia, fecha esperada, notas y los productos con cantidad, costo e IVA
// conecta con: usePurchaseForm (estado, búsqueda de productos y envío), purchases.rules (totales) y DrawerFormShell.css (armazón); lo abre formRegistry («purchaseForm»)
// ojo: la orden es de la bodega activa; hay que poner cantidad y costo en cada producto; el IVA arranca en 19 % y se puede cambiar
import React from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import './PurchasePanels.css'
import { MoneyInput } from '@/global/components/UI/molecules/form'
import { formatCOP } from '@/global/helpers/formatting/format'
import { usePurchaseForm } from '../../hooks/usePurchaseForm'

export const PurchaseFormPanel: React.FC = () => {
  const form = usePurchaseForm()

  return (
    <form className="drawer-form" onSubmit={form.submit}>
      <div className="drawer-form-body">
        <p className="drawer-form-note">Bodega que recibe: <strong>{form.warehouseName || 'sin elegir'}</strong></p>
        {form.error && <div className="form-field-error-msg">{form.error}</div>}

        <section className="drawer-form-section">
          <div className="drawer-form-field">
            <label className="drawer-form-label" htmlFor="purchase-supplier">Proveedor *</label>
            <select id="purchase-supplier" className="drawer-form-control" value={form.supplierId} onChange={(e) => form.setSupplierId(Number(e.target.value))} disabled={form.saving}>
              <option value={0}>Elige un proveedor</option>
              {form.suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </div>
          <div className="drawer-form-grid">
            <div className="drawer-form-field">
              <label className="drawer-form-label" htmlFor="purchase-ref">Referencia del proveedor</label>
              <input id="purchase-ref" className="drawer-form-control" value={form.supplierRef} onChange={(e) => form.setSupplierRef(e.target.value)} placeholder="Ej: FAC-1001" disabled={form.saving} />
            </div>
            <div className="drawer-form-field">
              <label className="drawer-form-label" htmlFor="purchase-date">Fecha esperada</label>
              <input id="purchase-date" className="drawer-form-control" type="date" value={form.expectedDate} onChange={(e) => form.setExpectedDate(e.target.value)} disabled={form.saving} />
            </div>
          </div>
          <div className="drawer-form-field">
            <label className="drawer-form-label" htmlFor="purchase-notes">Notas</label>
            <textarea id="purchase-notes" className="drawer-form-control" rows={2} value={form.notes} onChange={(e) => form.setNotes(e.target.value)} disabled={form.saving} />
          </div>
        </section>

        <section className="drawer-form-section">
          <div className="drawer-form-field purchase-search">
            <label className="drawer-form-label" htmlFor="purchase-product">Agregar producto del proveedor</label>
            <input id="purchase-product" className="drawer-form-control" value={form.text} onChange={(e) => form.setText(e.target.value)} placeholder={form.supplierId > 0 ? 'Busca por código o nombre en su catálogo...' : 'Primero elige un proveedor'} autoComplete="off" disabled={form.saving || form.supplierId <= 0} />
            {form.loadingCatalog && <span className="drawer-form-hint">Consultando el catálogo del proveedor…</span>}
            {form.catalogEmpty && <span className="drawer-form-hint">Este proveedor no tiene productos en su catálogo: agrégalos en Terceros › Proveedores › Catálogo.</span>}
            {form.results.length > 0 && (
              <ul className="purchase-results" aria-label="Productos encontrados">
                {form.results.map((product) => (
                  <li key={product.productId}>
                    <button type="button" className="purchase-option" onClick={() => form.addProduct(product)}>
                      <strong>{product.code}</strong>
                      <span>{product.name} · {formatCOP(product.cost)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {form.lines.map((line, index) => (
            <div key={line.productId} className="purchase-draft-line">
              <div className="purchase-receive-head">
                <strong>{line.productCode}</strong>
                <span>{line.productName}</span>
              </div>
              <div className="purchase-draft-fields">
                <input className="drawer-form-control" type="number" min={1} step={1} aria-label={`Cantidad de ${line.productName}`} value={line.quantity} onChange={(e) => form.changeLine(index, { quantity: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} disabled={form.saving} />
                <MoneyInput className="drawer-form-control" aria-label={`Costo unitario de ${line.productName}`} placeholder="Costo" value={line.unitCost || ''} onValueChange={(digits) => form.changeLine(index, { unitCost: Number(digits) || 0 })} disabled={form.saving} />
                <input className="drawer-form-control" type="number" min={0} max={100} step={1} aria-label={`IVA de ${line.productName}`} value={line.ivaPercent} onChange={(e) => form.changeLine(index, { ivaPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} disabled={form.saving} />
                <button type="button" className="btn-secondary" aria-label={`Quitar ${line.productName}`} onClick={() => form.removeLine(index)} disabled={form.saving}>Quitar</button>
              </div>
            </div>
          ))}
          {form.lines.length === 0 && <span className="drawer-form-hint">Busca y agrega los productos de la orden.</span>}

          <dl className="purchase-facts">
            <div><dt>Subtotal</dt><dd>{formatCOP(form.totals.subtotal)}</dd></div>
            <div><dt>IVA</dt><dd>{formatCOP(form.totals.iva)}</dd></div>
            <div><dt>Total</dt><dd><strong>{formatCOP(form.totals.total)}</strong></dd></div>
          </dl>
        </section>
      </div>

      <div className="drawer-form-footer">
        <button type="button" className="btn-secondary" disabled={form.saving} onClick={form.cancel}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={Boolean(form.problem) || form.saving} title={form.problem ?? undefined}>
          {form.saving ? 'Creando…' : 'Crear orden'}
        </button>
      </div>
    </form>
  )
}

export default PurchaseFormPanel
