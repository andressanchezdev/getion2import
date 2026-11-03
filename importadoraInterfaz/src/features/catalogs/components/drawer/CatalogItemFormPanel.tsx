// CatalogItemFormPanel · formulario en panel lateral para crear o editar marcas, categorías o modelos
// conecta con: useCatalogItemForm (estado y guardado), catalogs.labels (textos) y navigation (cerrar el panel)
import React from 'react'
import './CatalogItemFormPanel.css'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { closeDrawerForm } from '@/features/navigation'
import { useCatalogItemForm } from '../../hooks/useCatalogItemForm'
import { nameExample } from '../../helpers/catalogs.labels'
import type { CatalogItemPayload } from '../../types/catalogs.types'

interface CatalogItemFormPanelProps {
  payload: CatalogItemPayload
}

// campos del registro y botones de guardar o cancelar
export const CatalogItemFormPanel: React.FC<CatalogItemFormPanelProps> = ({ payload }) => {
  const dispatch = useAppDispatch()
  const form = useCatalogItemForm(payload)
  const { saving } = form

  return (
    <form className="catalog-form-panel" onSubmit={form.submit}>
      <div className="catalog-form-body">
        {form.error && <div className="form-field-error-msg">{form.error}</div>}

        <div className="catalog-form-field">
          <label htmlFor="cat-name">Nombre de {payload.noun.slice(0, -1)}</label>
          <input
            id="cat-name"
            type="text"
            className="catalog-form-input"
            value={form.name}
            onChange={(e) => form.setName(e.target.value)}
            disabled={saving}
            placeholder={`Ej: ${nameExample(payload.type)}`}
            required
            autoFocus
          />
        </div>

        {payload.type === 'brand' ? (
          <div className="catalog-form-field">
            <label htmlFor="cat-image">URL del Logo (Opcional)</label>
            <input
              id="cat-image"
              type="url"
              className="catalog-form-input"
              value={form.image}
              onChange={(e) => form.setImage(e.target.value)}
              disabled={saving}
              placeholder="https://..."
            />
            {form.image && (
              <div className="catalog-preview-img">
                <img src={form.image} alt="Preview" onError={(e) => ((e.target as HTMLElement).style.display = 'none')} />
              </div>
            )}
          </div>
        ) : (
          <div className="catalog-form-field">
            <label htmlFor="cat-desc">Descripción (Opcional)</label>
            <textarea
              id="cat-desc"
              className="catalog-form-textarea"
              rows={3}
              value={form.description}
              onChange={(e) => form.setDescription(e.target.value)}
              disabled={saving}
              placeholder="Detalles adicionales..."
            />
          </div>
        )}
      </div>

      <div className="catalog-form-footer">
        <button type="button" className="btn-secondary" disabled={saving} onClick={() => dispatch(closeDrawerForm())}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : form.isEdit ? 'Guardar cambios' : 'Crear'}
        </button>
      </div>
    </form>
  )
}

export default CatalogItemFormPanel
