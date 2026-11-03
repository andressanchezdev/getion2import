// AssignStockPanel · formulario en el panel derecho para asignar un producto del catálogo a una ubicación de la bodega activa, con sus unidades
// conecta con: useAssignStockForm (búsqueda, estado y guardado) y DrawerFormShell.css (armazón); lo abre formRegistry («assignStock»)
// ojo: solo se pueden elegir ubicaciones activas de la bodega; si la ubicación ya tiene el producto, las unidades se suman
import React from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import './AssignStockPanel.css'
import { useAssignStockForm, type AssignStockPayload } from '../../hooks/useAssignStockForm'

export const AssignStockPanel: React.FC<{ payload?: AssignStockPayload }> = ({ payload }) => {
  const form = useAssignStockForm(payload?.onDone)

  return (
    <form className="drawer-form" onSubmit={form.submit}>
      <div className="drawer-form-body">
        <p className="drawer-form-note">
          Bodega: <strong>{form.warehouseName || 'sin elegir'}</strong>
        </p>
        {form.error && <div className="form-field-error-msg">{form.error}</div>}

        <div className="drawer-form-field assign-stock-search">
          <label className="drawer-form-label" htmlFor="assign-product">Producto del catálogo</label>
          <input id="assign-product" className="drawer-form-control" value={form.text} onChange={(e) => form.setText(e.target.value)} placeholder="Busca por código o nombre..." disabled={form.saving} autoComplete="off" autoFocus />
          {form.searching && <span className="drawer-form-hint">Buscando…</span>}
          {form.results.length > 0 && (
            <ul className="assign-stock-results" role="listbox" aria-label="Productos encontrados">
              {form.results.map((product) => (
                <li key={product.id}>
                  <button type="button" role="option" aria-selected={false} className="assign-stock-option" onClick={() => form.pick(product)}>
                    <strong>{product.code}</strong>
                    <span>{product.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="drawer-form-grid">
          <div className="drawer-form-field">
            <label className="drawer-form-label" htmlFor="assign-location">Ubicación</label>
            <select id="assign-location" className="drawer-form-control" value={form.location} onChange={(e) => form.setLocation(e.target.value)} disabled={form.saving}>
              <option value="">Elige una ubicación</option>
              {form.locationOptions.map((location) => (
                <option key={location.id} value={location.code}>{location.code}</option>
              ))}
            </select>
            {form.locationOptions.length === 0 && <span className="drawer-form-hint">Esta bodega no tiene ubicaciones activas: créalas en Inventario › Ubicaciones.</span>}
          </div>
          <div className="drawer-form-field">
            <label className="drawer-form-label" htmlFor="assign-quantity">Unidades</label>
            <input id="assign-quantity" className="drawer-form-control" type="number" min={1} step={1} value={form.quantity} onChange={(e) => form.setQuantity(e.target.value)} disabled={form.saving} />
          </div>
        </div>
      </div>

      <div className="drawer-form-footer">
        <button type="button" className="btn-secondary" disabled={form.saving} onClick={form.cancel}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={!form.valid || form.saving}>
          {form.saving ? 'Guardando…' : 'Asignar a la ubicación'}
        </button>
      </div>
    </form>
  )
}

export default AssignStockPanel
