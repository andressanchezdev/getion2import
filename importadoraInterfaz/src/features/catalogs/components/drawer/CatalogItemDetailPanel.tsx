// CatalogItemDetailPanel · panel lateral para ver detalles de una marca, categoría o modelo
import React from 'react'
import './CatalogItemDetailPanel.css'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { closeDrawerForm, openDrawerForm } from '@/features/navigation'
import type { CatalogItemPayload } from '../../types/catalogs.types'

interface CatalogItemDetailPanelProps {
  payload: CatalogItemPayload
}

export const CatalogItemDetailPanel: React.FC<CatalogItemDetailPanelProps> = ({ payload }) => {
  const dispatch = useAppDispatch()
  const item = payload.item

  if (!item) return null

  return (
    <div className="catalog-detail-panel">
      <div className="catalog-detail-body">
        <div className="catalog-detail-header-card">
          <div className="catalog-detail-id-badge">ID #{item.id}</div>
          <h3 className="catalog-detail-title">{item.name}</h3>
          <span className="catalog-detail-type">Tipo: {payload.noun.slice(0, -1)}</span>
        </div>

        {item.image && (
          <div className="catalog-detail-section">
            <span className="catalog-detail-sec-title">Logo / Imagen</span>
            <div className="catalog-detail-img-box">
              <img src={item.image} alt={item.name} />
            </div>
          </div>
        )}

        {item.description && (
          <div className="catalog-detail-section">
            <span className="catalog-detail-sec-title">Descripción</span>
            <p className="catalog-detail-text">{item.description}</p>
          </div>
        )}
      </div>

      <div className="catalog-detail-footer">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => dispatch(closeDrawerForm())}
        >
          Cerrar
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            dispatch(openDrawerForm({ kind: 'catalogItem', payload }))
          }}
        >
          Editar
        </button>
      </div>
    </div>
  )
}

export default CatalogItemDetailPanel

