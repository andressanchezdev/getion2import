// SupplierCatalogPanel · catálogo de un proveedor en el panel derecho: los productos que nos vende con su código y costo; se busca un producto nuestro, se le pone el costo y se agrega
// conecta con: useSupplierCatalog (lista, búsqueda y guardado), MoneyInput, global format y DrawerFormShell.css (armazón); lo abre formRegistry («supplierCatalog») desde la tabla de proveedores
// ojo: la orden de compra solo ofrece los productos que estén aquí; volver a agregar un producto cambia su costo
import React from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import './PurchasePanels.css'
import { Icon } from '@/global/components/UI/atoms/Icon'
import { MoneyInput } from '@/global/components/UI/molecules/form'
import { formatCOP } from '@/global/helpers/formatting/format'
import plusIcon from '@/assets/icons/plus.svg?raw'
import trashIcon from '@/assets/icons/trash.svg?raw'
import { useSupplierCatalog } from '../../hooks/useSupplierCatalog'

export interface SupplierCatalogPayload {
  id: number // el proveedor
  name: string
}

export const SupplierCatalogPanel: React.FC<{ payload: SupplierCatalogPayload }> = ({ payload }) => {
  const catalog = useSupplierCatalog(payload.id)

  return (
    <div className="drawer-form">
      <div className="drawer-form-body">
        <p className="drawer-form-note">Estos son los productos que nos vende <strong>{payload.name}</strong>. En una orden de compra solo se pueden pedir los de esta lista.</p>

        <form className="drawer-form-section" onSubmit={catalog.save}>
          {catalog.selected ? (
            <>
              <div className="purchase-receive-head">
                <strong>{catalog.selected.code}</strong>
                <span>{catalog.selected.name}</span>
                <button type="button" className="btn-secondary" onClick={catalog.clearSelection}>Cambiar</button>
              </div>
              <div className="drawer-form-grid">
                <div className="drawer-form-field">
                  <label className="drawer-form-label" htmlFor="supplier-cost">Costo unitario *</label>
                  <MoneyInput id="supplier-cost" className="drawer-form-control" value={catalog.cost} onValueChange={catalog.setCost} placeholder="Ej: 25.000" disabled={catalog.saving} required />
                </div>
                <div className="drawer-form-field">
                  <label className="drawer-form-label" htmlFor="supplier-code">Código del proveedor</label>
                  <input id="supplier-code" className="drawer-form-control" value={catalog.supplierCode} maxLength={80} onChange={(e) => catalog.setSupplierCode(e.target.value)} placeholder="Opcional" disabled={catalog.saving} />
                </div>
              </div>
              <button type="submit" className="btn-primary" disabled={catalog.saving || catalog.cost === ''}>
                <Icon svg={plusIcon} /> {catalog.saving ? 'Guardando…' : 'Guardar en el catálogo'}
              </button>
            </>
          ) : (
            <div className="drawer-form-field purchase-search">
              <label className="drawer-form-label" htmlFor="supplier-product">Agregar producto</label>
              <input id="supplier-product" className="drawer-form-control" value={catalog.text} onChange={(e) => catalog.setText(e.target.value)} placeholder="Busca entre tus productos por código o nombre..." autoComplete="off" />
              {catalog.searching && <span className="drawer-form-hint">Buscando…</span>}
              {catalog.results.length > 0 && (
                <ul className="purchase-results" aria-label="Productos encontrados">
                  {catalog.results.map((product) => (
                    <li key={product.id}>
                      <button type="button" className="purchase-option" onClick={() => catalog.choose(product)}>
                        <strong>{product.code}</strong>
                        <span>{product.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </form>

        <section className="drawer-form-section">
          <h4 className="drawer-form-label">Productos del proveedor{catalog.items ? ` (${catalog.items.length})` : ''}</h4>
          {catalog.loadError && <div className="form-field-error-msg">{catalog.loadError}</div>}
          {catalog.items === null && !catalog.loadError && <span className="drawer-form-hint">Cargando el catálogo…</span>}
          {catalog.items?.length === 0 && <span className="drawer-form-hint">Todavía no tiene productos: agrega el primero arriba.</span>}
          {catalog.items?.map((item) => (
            <div key={item.productId} className="purchase-draft-line">
              <div className="purchase-receive-head">
                <strong>{item.code}</strong>
                <span>{item.name}</span>
              </div>
              <div className="purchase-draft-fields">
                <span>{formatCOP(item.cost)}</span>
                <span>{item.supplierCode || '—'}</span>
                <button type="button" className="btn-secondary" aria-label={`Quitar ${item.name} del catálogo`} onClick={() => catalog.remove(item.productId)} disabled={catalog.saving}>
                  <Icon svg={trashIcon} />
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}

export default SupplierCatalogPanel
