// CreateProductForm · formulario de nuevo producto en el panel derecho: datos, clasificación (categoría, marca y modelo), tarifas y ubicación inicial en una bodega
// conecta con: useCreateProductForm (estado, validación y guardado), MoneyInput (dinero con puntos de miles), DrawerFormShell.css (armazón) y navigation (cerrar el panel)
// ojo: la ubicación se elige de las que ya existen en la bodega (se administran en Gestión Inventario > Ubicaciones); al guardar con ubicación se abre el QR para pegar en el estante
import React from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import { closeDrawerForm } from '@/features/navigation'
import { MoneyInput } from '@/global/components/UI/molecules/form'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { useCreateProductForm } from '../../hooks/useCreateProductForm'

// niveles de precio con el nombre que usa la lista de precios del producto
const PRICE_TIERS = [
  { key: 'p0', label: 'P0 · Público / Mostrador' },
  { key: 'p1', label: 'P1 · Mayorista' },
  { key: 'p2', label: 'P2 · Distribuidor' },
  { key: 'p3', label: 'P3 · Especial' },
] as const

export const CreateProductForm: React.FC = () => {
  const dispatch = useAppDispatch()
  const form = useCreateProductForm()
  const { saving } = form

  return (
    <form className="drawer-form" onSubmit={form.submit}>
      <div className="drawer-form-body">
        {form.error && <div className="form-field-error-msg">{form.error}</div>}

        <section className="drawer-form-section">
          <h4 className="drawer-form-section-title">Datos del producto</h4>
          <div className="drawer-form-grid">
            <div className="drawer-form-field">
              <label className="drawer-form-label" htmlFor="product-code">Código *</label>
              <input id="product-code" className="drawer-form-control" value={form.code} onChange={(e) => form.setCode(e.target.value)} disabled={saving} autoFocus required />
            </div>
            <div className="drawer-form-field">
              <label className="drawer-form-label" htmlFor="product-unit">Unidad</label>
              <input id="product-unit" className="drawer-form-control" value={form.unit} onChange={(e) => form.setUnit(e.target.value)} disabled={saving} />
            </div>
          </div>
          <div className="drawer-form-field">
            <label className="drawer-form-label" htmlFor="product-name">Nombre *</label>
            <input id="product-name" className="drawer-form-control" value={form.name} onChange={(e) => form.setName(e.target.value)} disabled={saving} required />
          </div>
          <div className="drawer-form-field">
            <label className="drawer-form-label" htmlFor="product-description">Descripción</label>
            <textarea id="product-description" className="drawer-form-control" rows={3} value={form.description} onChange={(e) => form.setDescription(e.target.value)} disabled={saving} />
          </div>
          <label className="drawer-form-check">
            <input type="checkbox" checked={form.isNew} onChange={(e) => form.setIsNew(e.target.checked)} disabled={saving} />
            Marcar como producto nuevo
          </label>
        </section>

        <section className="drawer-form-section">
          <h4 className="drawer-form-section-title">Clasificación</h4>
          <div className="drawer-form-field">
            <label className="drawer-form-label" htmlFor="product-category">Categoría *</label>
            <select id="product-category" className="drawer-form-control" value={form.categoryId} onChange={(e) => form.setCategoryId(Number(e.target.value))} disabled={saving} required>
              <option value={0}>Elige la categoría…</option>
              {form.categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          <div className="drawer-form-grid">
            <div className="drawer-form-field">
              <label className="drawer-form-label" htmlFor="product-brand">Marca</label>
              <select id="product-brand" className="drawer-form-control" value={form.brandId} onChange={(e) => form.setBrandId(Number(e.target.value))} disabled={saving}>
                <option value={0}>Sin marca</option>
                {form.brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
            </div>
            <div className="drawer-form-field">
              <label className="drawer-form-label" htmlFor="product-model">Modelo de moto principal</label>
              <select id="product-model" className="drawer-form-control" value={form.modelId} onChange={(e) => form.setModelId(Number(e.target.value))} disabled={saving}>
                <option value={0}>Sin modelo</option>
                {form.models.map((model) => (
                  <option key={model.id} value={model.id}>{model.name}</option>
                ))}
              </select>
            </div>
          </div>

          {form.models.length > 0 && (
            <div className="drawer-form-field" style={{ marginTop: '0.75rem' }}>
              <label className="drawer-form-label">Modelos compatibles adicionales (múltiples)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '120px', overflowY: 'auto', padding: '6px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
                {form.models.map((model) => {
                  const isSelected = form.compatibleModelIds.includes(model.id)
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => form.toggleCompatibleModel(model.id)}
                      disabled={saving}
                      style={{
                        padding: '3px 8px',
                        fontSize: 'var(--text-xs)',
                        borderRadius: '12px',
                        border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                        background: isSelected ? 'var(--color-primary-bg, #eff6ff)' : 'transparent',
                        color: isSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        fontWeight: isSelected ? 600 : 500,
                      }}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {model.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        <section className="drawer-form-section">
          <h4 className="drawer-form-section-title">Costo y tarifas</h4>
          <div className="drawer-form-field">
            <label className="drawer-form-label" htmlFor="product-cost">Último costo</label>
            <MoneyInput id="product-cost" className="drawer-form-control" value={form.lastCost || ''} placeholder="0" onValueChange={(digits) => form.setLastCost(Number(digits || 0))} disabled={saving} />
          </div>
          <div className="drawer-form-grid">
            {PRICE_TIERS.map((tier) => (
              <div key={tier.key} className="drawer-form-field">
                <label className="drawer-form-label" htmlFor={`product-price-${tier.key}`}>{tier.label}</label>
                <MoneyInput id={`product-price-${tier.key}`} className="drawer-form-control" value={form.prices[tier.key] || ''} placeholder="0" onValueChange={(digits) => form.setPrice(tier.key, digits)} disabled={saving} />
              </div>
            ))}
          </div>
        </section>

        <section className="drawer-form-section">
          <h4 className="drawer-form-section-title">Ubicaciones (opcional)</h4>
          <div className="drawer-form-field">
            <label className="drawer-form-label" htmlFor="product-warehouse">Bodega</label>
            <select id="product-warehouse" className="drawer-form-control" value={form.warehouseId} onChange={(e) => form.setWarehouseId(Number(e.target.value))} disabled={saving}>
              <option value={0}>Elige la bodega…</option>
              {form.warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
              ))}
            </select>
          </div>
          {form.places.map((place, index) => (
            <div key={index} className="drawer-form-grid">
              <div className="drawer-form-field">
                <label className="drawer-form-label" htmlFor={`product-location-${index}`}>Ubicación {form.places.length > 1 ? index + 1 : ''}</label>
                <select id={`product-location-${index}`} className="drawer-form-control" value={place.location} onChange={(e) => form.changePlace(index, { location: e.target.value })} disabled={saving || !form.warehouseId}>
                  <option value="">Sin ubicación</option>
                  {form.activeLocations.map((item) => (
                    <option key={item.id} value={item.code}>{item.code}</option>
                  ))}
                </select>
              </div>
              <div className="drawer-form-field">
                <label className="drawer-form-label" htmlFor={`product-quantity-${index}`}>Unidades</label>
                <div className="drawer-form-inline">
                  <input id={`product-quantity-${index}`} type="number" min={0} className="drawer-form-control" value={place.quantity} onChange={(e) => form.changePlace(index, { quantity: Math.max(0, Number(e.target.value) || 0) })} disabled={saving || !place.location} />
                  {form.places.length > 1 && (
                    <button type="button" className="drawer-form-remove" aria-label={`Quitar la ubicación ${index + 1}`} onClick={() => form.removePlace(index)}>
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <button type="button" className="drawer-form-add" onClick={form.addPlace} disabled={saving || !form.warehouseId}>
            + Agregar otra ubicación
          </button>
          <span className="drawer-form-hint">Un producto puede estar en varias ubicaciones de la bodega. Con 0 unidades solo se asigna el estante; al guardar se abre un QR por ubicación para pegarlo ahí.</span>
        </section>
      </div>

      <div className="drawer-form-footer">
        <button type="button" className="btn-secondary" disabled={saving} onClick={() => dispatch(closeDrawerForm())}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Creando…' : 'Crear producto'}
        </button>
      </div>
    </form>
  )
}

export default CreateProductForm
