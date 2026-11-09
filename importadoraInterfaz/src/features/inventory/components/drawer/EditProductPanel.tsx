// EditProductPanel · panel lateral para editar los datos básicos, categoría, nuevo y estado de un producto
// conecta con: useEditProductForm (estado y guardado) y navigation (cerrar el panel)
import React from 'react'
import './EditProductPanel.css'
import { closeDrawerForm } from '@/features/navigation'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import type { Product } from '@/features/shop'
import { IVA_OPTIONS } from '../../constants/inventory.constants'
import { useEditProductForm } from '../../hooks/useEditProductForm'

interface EditProductPanelProps {
  product: Product
}

// campos del producto y botones de guardar o cancelar
export const EditProductPanel: React.FC<EditProductPanelProps> = ({ product }) => {
  const dispatch = useAppDispatch()
  const form = useEditProductForm(product)
  const { saving } = form

  return (
    <form className="edit-product-panel" onSubmit={form.submit}>
      <div className="edit-product-body">
        {form.error && <div className="form-field-error-msg">{form.error}</div>}

        <div className="edit-product-field">
          <label htmlFor="edit-prod-code">Código de producto</label>
          <input id="edit-prod-code" type="text" className="edit-product-input" value={form.code} onChange={(e) => form.setCode(e.target.value)} disabled={saving} />
        </div>

        <div className="edit-product-field">
          <label htmlFor="edit-prod-name">Nombre / Descripción corta</label>
          <input id="edit-prod-name" type="text" className="edit-product-input" value={form.name} onChange={(e) => form.setName(e.target.value)} disabled={saving} required />
        </div>

        <div className="edit-product-field">
          <label htmlFor="edit-prod-category">Categoría</label>
          <select id="edit-prod-category" className="edit-product-select" value={form.categoryId} onChange={(e) => form.setCategoryId(e.target.value)} disabled={saving}>
            <option value="">Seleccionar categoría…</option>
            {form.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="edit-product-field">
          <label htmlFor="edit-prod-brand">Marca</label>
          <select id="edit-prod-brand" className="edit-product-select" value={form.brandId} onChange={(e) => form.setBrandId(Number(e.target.value))} disabled={saving}>
            <option value={0}>Sin marca</option>
            {form.brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="edit-product-field">
          <label htmlFor="edit-prod-model">Modelo de moto</label>
          <select id="edit-prod-model" className="edit-product-select" value={form.modelId} onChange={(e) => form.setModelId(Number(e.target.value))} disabled={saving}>
            <option value={0}>Sin modelo</option>
            {form.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="edit-product-field">
          <label htmlFor="edit-prod-iva">IVA del producto</label>
          <select id="edit-prod-iva" className="edit-product-select" value={form.iva} onChange={(e) => form.setIva(Number(e.target.value))} disabled={saving}>
            {IVA_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="edit-product-field">
          <label htmlFor="edit-prod-status">Estado del producto</label>
          <select
            id="edit-prod-status"
            className="edit-product-select"
            value={form.status}
            onChange={(e) => form.setStatus(e.target.value as 'active' | 'inactive')}
            disabled={saving}
          >
            <option value="active">Activo (En operación)</option>
            <option value="inactive">Inactivo (Fuera de operación)</option>
          </select>
          <span className="edit-product-hint">Si está inactivo, el producto no estará disponible para ventas y saldrá de operación.</span>
        </div>

        {form.status === 'inactive' && form.initialStatus !== 'inactive' && (
          <div className="edit-product-field">
            <label htmlFor="edit-prod-reason">Motivo de la desactivación *</label>
            <textarea id="edit-prod-reason" className="edit-product-textarea" rows={2} maxLength={100} placeholder="De 10 a 100 caracteres" value={form.reason} onChange={(e) => form.setReason(e.target.value)} disabled={saving} />
            <span className="edit-product-hint">{form.reason.trim().length}/100 (mínimo 10)</span>
          </div>
        )}

        <div className="edit-product-checkbox-row">
          <label className="edit-product-checkbox-label">
            <input type="checkbox" className="edit-product-checkbox" checked={form.isNew} onChange={(e) => form.setIsNew(e.target.checked)} disabled={saving} />
            <span className="edit-product-checkbox-text">¿Marcar como nuevo?</span>
          </label>
          <span className="edit-product-hint">Al marcarlo como nuevo, se mostrará la insignia de producto nuevo en el catálogo.</span>
        </div>

        <div className="edit-product-field">
          <label htmlFor="edit-prod-desc">Descripción detallada</label>
          <textarea id="edit-prod-desc" className="edit-product-textarea" rows={4} value={form.description} onChange={(e) => form.setDescription(e.target.value)} disabled={saving} />
        </div>
      </div>

      <div className="edit-product-footer">
        <button type="button" className="btn-secondary" disabled={saving} onClick={() => dispatch(closeDrawerForm())}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}

export default EditProductPanel
